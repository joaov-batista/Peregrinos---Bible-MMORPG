// Backend: Supabase (contas, personagens, ranking e jogadores online em tempo real).
// Sem as variáveis VITE_SUPABASE_* o jogo funciona em modo offline, salvando no navegador.
import { createClient } from '@supabase/supabase-js';
import { store, uid, weekId } from './util.js';

const URL = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const ONLINE = !!(URL && KEY && !URL.includes('SEU-PROJETO'));
const sb = ONLINE ? createClient(URL, KEY) : null;
const LOCAL_KEY = 'peregrinos.local.v1';

const local = () => store.get(LOCAL_KEY, { chars: [] });
const saveLocal = d => store.set(LOCAL_KEY, d);
const SOC_KEY = 'peregrinos.social.v1';
const soc = () => store.get(SOC_KEY, { friends: [], clans: [], members: [] });
const saveSoc = d => store.set(SOC_KEY, d);
export const CUSTO_CASA_CLA = [3000, 10000, 30000]; // igual a subir_casa_cla no schema.sql
// nome/classe/nível de vários personagens de uma vez: { id: { id, name, cls, level, score } }
async function players(ids) {
  const out = {}; if (!ids.length) return out;
  if (!ONLINE) { for (const c of local().chars) if (ids.includes(c.id)) out[c.id] = { id: c.id, name: c.name, cls: c.cls, level: c.level, score: c.score }; return out; }
  const { data } = await sb.from('players').select('id,name,class,level,score').in('id', ids);
  for (const r of data || []) out[r.id] = { id: r.id, name: r.name, cls: r.class, level: r.level, score: r.score };
  return out;
}

export const net = {
  user: null,
  async init() {
    if (!ONLINE) return null;
    const { data } = await sb.auth.getSession();
    this.user = data.session?.user || null;
    return this.user;
  },
  async signUp(email, password) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw traduz(error);
    this.user = data.session?.user || null;
    return { needsConfirm: !data.session };
  },
  async signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw traduz(error);
    this.user = data.user;
  },
  async signOut() { if (ONLINE) await sb.auth.signOut(); this.user = null; },

  async listChars() {
    if (!ONLINE || !this.user) return local().chars;
    const { data, error } = await sb.from('characters').select('*').eq('user_id', this.user.id).order('created_at');
    if (error) throw traduz(error);
    return data.map(fromRow);
  },
  async createChar(c) {
    c.id = uid(); c.week_id = weekId(); c.week_score = 0; c.score = 0; c.level = 1;
    if (!ONLINE || !this.user) {
      const d = local();
      if (d.chars.some(x => x.name.toLowerCase() === c.name.toLowerCase())) throw new Error('Você já tem um personagem com esse nome.');
      d.chars.push(c); saveLocal(d); return c;
    }
    const { data, error } = await sb.from('characters').insert(toRow(c, this.user.id)).select().single();
    if (error) throw error.code === '23505' ? new Error('Esse nome já está em uso. Escolha outro.') : traduz(error);
    return fromRow(data);
  },
  async deleteChar(id) {
    if (!ONLINE || !this.user) { const d = local(); d.chars = d.chars.filter(c => c.id !== id); saveLocal(d); return; }
    await sb.from('characters').delete().eq('id', id);
  },
  async saveChar(c) {
    if (c.week_id !== weekId()) { c.week_id = weekId(); c.week_score = 0; }
    if (!ONLINE || !this.user) { const d = local(); const i = d.chars.findIndex(x => x.id === c.id); if (i >= 0) d.chars[i] = c; saveLocal(d); return; }
    const { error } = await sb.from('characters').update({
      level: c.level, score: c.score, week_id: c.week_id, week_score: c.week_score, data: c.data, look: c.look, class: c.cls, updated_at: new Date().toISOString()
    }).eq('id', c.id);
    if (error) console.warn('Falha ao salvar', error);
  },
  async ranking(kind = 'geral') {
    if (!ONLINE) {
      const list = local().chars.map(c => ({ name: c.name, cls: c.cls, level: c.level, score: kind === 'semana' ? (c.week_id === weekId() ? c.week_score : 0) : c.score }));
      return list.sort((a, b) => b.score - a.score).slice(0, 50);
    }
    let q = sb.from('ranking').select('*');
    q = kind === 'semana' ? q.eq('week_id', weekId()).order('week_score', { ascending: false }) : q.order('score', { ascending: false });
    const { data, error } = await q.limit(50);
    if (error) throw traduz(error);
    return data.map(r => ({ name: r.name, cls: r.class, level: r.level, score: kind === 'semana' ? r.week_score : r.score }));
  },

  // Amizades e clãs. Offline, funcionam entre os personagens deste aparelho.
  social: {
    async search(me, q) {
      q = q.trim(); if (q.length < 2) return [];
      if (!ONLINE) return local().chars.filter(c => c.id !== me.id && c.name.toLowerCase().includes(q.toLowerCase())).map(c => ({ id: c.id, name: c.name, cls: c.cls, level: c.level }));
      const { data, error } = await sb.from('players').select('id,name,class,level').ilike('name', '%' + q.replace(/[%_]/g, '') + '%').neq('id', me.id).limit(10);
      if (error) throw traduz(error);
      return data.map(r => ({ id: r.id, name: r.name, cls: r.class, level: r.level }));
    },
    // [{ fid, id, name, cls, level, st: 'amigo' | 'recebido' | 'enviado' }]
    async friends(me) {
      let rows;
      if (!ONLINE) rows = soc().friends.filter(f => f.requester === me.id || f.addressee === me.id);
      else { const { data, error } = await sb.from('friendships').select('*').or('requester.eq.' + me.id + ',addressee.eq.' + me.id); if (error) throw traduz(error); rows = data; }
      const other = f => f.requester === me.id ? f.addressee : f.requester;
      const info = await players(rows.map(other));
      return rows.map(f => ({ fid: f.id, ...(info[other(f)] || { id: other(f), name: '?' }), st: f.status === 'aceito' ? 'amigo' : f.requester === me.id ? 'enviado' : 'recebido' }));
    },
    async addFriend(me, otherId) {
      const cur = await this.friends(me);
      const ja = cur.find(f => f.id === otherId);
      if (ja) { if (ja.st === 'recebido') return this.acceptFriend(ja.fid); throw new Error(ja.st === 'amigo' ? 'Vocês já são amigos.' : 'Pedido já enviado.'); }
      if (!ONLINE) { const s = soc(); s.friends.push({ id: uid(), requester: me.id, addressee: otherId, status: 'pendente' }); saveSoc(s); return; }
      const { error } = await sb.from('friendships').insert({ requester: me.id, addressee: otherId });
      if (error) throw traduz(error);
    },
    async acceptFriend(fid) {
      if (!ONLINE) { const s = soc(); const f = s.friends.find(x => x.id === fid); if (f) f.status = 'aceito'; saveSoc(s); return; }
      const { error } = await sb.from('friendships').update({ status: 'aceito' }).eq('id', fid);
      if (error) throw traduz(error);
    },
    async removeFriend(fid) {
      if (!ONLINE) { const s = soc(); s.friends = s.friends.filter(x => x.id !== fid); saveSoc(s); return; }
      const { error } = await sb.from('friendships').delete().eq('id', fid);
      if (error) throw traduz(error);
    },
    // { clan: {id,name,tag,lema,owner}, members: [{id,name,cls,level,score,role}] } ou null
    async myClan(me) {
      let m;
      if (!ONLINE) m = soc().members.find(x => x.char_id === me.id);
      else { const { data } = await sb.from('clan_members').select('*').eq('char_id', me.id).maybeSingle(); m = data; }
      if (!m) return null;
      return this.clan(m.clan_id);
    },
    async clan(id) {
      let clan, ms;
      if (!ONLINE) { const s = soc(); clan = s.clans.find(c => c.id === id); ms = s.members.filter(x => x.clan_id === id); }
      else {
        const [a, b] = await Promise.all([sb.from('clans').select('*').eq('id', id).maybeSingle(), sb.from('clan_members').select('*').eq('clan_id', id)]);
        clan = a.data; ms = b.data || [];
      }
      if (!clan) return null;
      const info = await players(ms.map(x => x.char_id));
      const members = ms.map(x => ({ ...(info[x.char_id] || { id: x.char_id, name: '?' }), role: x.role, doado: x.doado || 0 })).sort((a, b) => (b.role === 'lider') - (a.role === 'lider') || (b.score || 0) - (a.score || 0));
      return { clan, members };
    },
    async clans() {
      if (!ONLINE) {
        const s = soc(), chars = local().chars;
        return s.clans.map(c => { const ms = s.members.filter(m => m.clan_id === c.id); return { ...c, membros: ms.length, score: ms.reduce((t, m) => t + (chars.find(x => x.id === m.char_id)?.score || 0), 0) }; }).sort((a, b) => b.score - a.score);
      }
      const { data, error } = await sb.from('clan_ranking').select('*').order('score', { ascending: false }).limit(50);
      if (error) throw traduz(error);
      return data;
    },
    async createClan(me, name, tag, lema) {
      name = name.trim(); tag = tag.trim().toUpperCase(); lema = lema.trim().slice(0, 80);
      if (!/^.{3,20}$/u.test(name)) throw new Error('O nome do clã precisa ter de 3 a 20 letras.');
      if (!/^[A-Z0-9]{2,4}$/.test(tag)) throw new Error('A sigla precisa ter de 2 a 4 letras ou números.');
      if (await this.myClan(me)) throw new Error('Saia do seu clã antes de criar outro.');
      if (!ONLINE) {
        const s = soc();
        if (s.clans.some(c => c.name.toLowerCase() === name.toLowerCase() || c.tag === tag)) throw new Error('Já existe um clã com esse nome ou sigla.');
        const id = uid(); s.clans.push({ id, name, tag, lema, owner: me.id }); s.members.push({ char_id: me.id, clan_id: id, role: 'lider' }); saveSoc(s); return id;
      }
      const { data, error } = await sb.from('clans').insert({ name, tag, lema, owner: me.id }).select().single();
      if (error) throw error.code === '23505' ? new Error('Já existe um clã com esse nome ou sigla.') : traduz(error);
      const r = await sb.from('clan_members').insert({ char_id: me.id, clan_id: data.id, role: 'lider' });
      if (r.error) throw traduz(r.error);
      return data.id;
    },
    async joinClan(me, clanId) {
      if (await this.myClan(me)) throw new Error('Você já está num clã.');
      if (!ONLINE) { const s = soc(); if (s.members.filter(m => m.clan_id === clanId).length >= 30) throw new Error('Este clã está cheio (30 membros).'); s.members.push({ char_id: me.id, clan_id: clanId, role: 'membro' }); saveSoc(s); return; }
      const { error } = await sb.from('clan_members').insert({ char_id: me.id, clan_id: clanId });
      if (error) throw traduz(error);
    },
    // Sair (ou o líder expulsar alguém). Se o líder sai, o clã acaba.
    async leaveClan(me, clan, charId = me.id) {
      const fim = charId === me.id && clan.owner === me.id;
      if (!ONLINE) {
        const s = soc();
        if (fim) { s.clans = s.clans.filter(c => c.id !== clan.id); s.members = s.members.filter(m => m.clan_id !== clan.id); }
        else s.members = s.members.filter(m => m.char_id !== charId);
        saveSoc(s); return fim;
      }
      const { error } = fim ? await sb.from('clans').delete().eq('id', clan.id) : await sb.from('clan_members').delete().eq('char_id', charId);
      if (error) throw traduz(error);
      return fim;
    }
  },

  // Casas: visitar a casa de outro jogador, livro de visitas e tesouro/casa do clã.
  casa: {
    // { id, name, look, casa, verses, bosses } da casa de outro personagem
    async de(id) {
      if (!ONLINE) { const c = local().chars.find(x => x.id === id); return c && { id: c.id, name: c.name, look: c.look, casa: c.data.casa, verses: c.data.verses || [], bosses: c.data.stats?.bosses || {} }; }
      const { data, error } = await sb.from('casas').select('*').eq('id', id).maybeSingle();
      if (error) throw traduz(error);
      return data && { id: data.id, name: data.name, look: data.look, casa: data.casa, verses: data.verses || [], bosses: data.bosses || {} };
    },
    async livro(id) {
      if (!ONLINE) return (soc().visitas || []).filter(v => v.casa_de === id).slice(-20).reverse();
      const { data, error } = await sb.from('visitas').select('nome,msg,created_at').eq('casa_de', id).order('created_at', { ascending: false }).limit(20);
      if (error) throw traduz(error);
      return data;
    },
    async assinar(me, casaDe, msg) {
      msg = msg.trim().slice(0, 120); if (!msg) throw new Error('Escreva uma mensagem.');
      if (!ONLINE) { const s = soc(); (s.visitas = s.visitas || []).push({ casa_de: casaDe, autor: me.id, nome: me.name, msg, created_at: new Date().toISOString() }); saveSoc(s); return; }
      const { error } = await sb.from('visitas').insert({ casa_de: casaDe, autor: me.id, nome: me.name, msg });
      if (error) throw traduz(error);
    },
    // denários para o tesouro do clã; devolve o tesouro novo
    async doar(me, clan, valor) {
      if (!ONLINE) {
        const s = soc(), c = s.clans.find(x => x.id === clan.id), m = s.members.find(x => x.char_id === me.id && x.clan_id === clan.id);
        if (!c || !m) throw new Error('Você não é deste clã.');
        c.tesouro = (c.tesouro || 0) + valor; m.doado = (m.doado || 0) + valor; saveSoc(s); return c.tesouro;
      }
      const { data, error } = await sb.rpc('doar_cla', { cid: clan.id, quem: me.id, valor });
      if (error) throw traduz(error);
      return data;
    },
    // o líder constrói o próximo nível da casa do clã com o tesouro
    async subir(me, clan) {
      if (!ONLINE) {
        const s = soc(), c = s.clans.find(x => x.id === clan.id), n = c.casa_nivel || 0, custo = CUSTO_CASA_CLA[n];
        if (c.owner !== me.id) throw new Error('Só o líder pode construir.');
        if (custo == null) throw new Error('A casa do clã já está completa.');
        if ((c.tesouro || 0) < custo) throw new Error('Faltam ' + (custo - (c.tesouro || 0)) + ' denários no tesouro do clã.');
        c.tesouro -= custo; c.casa_nivel = n + 1; saveSoc(s); return c.casa_nivel;
      }
      const { data, error } = await sb.rpc('subir_casa_cla', { cid: clan.id });
      if (error) throw traduz(error);
      return data;
    }
  },

  // Mundo compartilhado: posição dos outros jogadores + chat (Supabase Realtime broadcast/presence).
  joinWorld(me, on) {
    if (!ONLINE) return { send() {}, chat() {}, ev() {}, leave() {}, count: () => 1, online: () => [me.id] };
    const ch = sb.channel('mundo', { config: { broadcast: { self: false }, presence: { key: me.id } } });
    let n = 1;
    ch.on('broadcast', { event: 'pos' }, ({ payload }) => on.pos(payload))
      .on('broadcast', { event: 'chat' }, ({ payload }) => on.chat(payload))
      .on('broadcast', { event: 'ev' }, ({ payload }) => on.ev?.(payload)) // inimigos compartilhados (ver game/mundoNet.js)
      .on('presence', { event: 'sync' }, () => { n = Object.keys(ch.presenceState()).length; on.count?.(n); })
      .on('presence', { event: 'leave' }, ({ key }) => on.leave(key))
      .subscribe(st => { if (st === 'SUBSCRIBED') ch.track({ name: me.name, cls: me.cls, at: Date.now() }); });
    return {
      send: p => ch.send({ type: 'broadcast', event: 'pos', payload: p }),
      chat: msg => ch.send({ type: 'broadcast', event: 'chat', payload: msg }),
      ev: msg => ch.send({ type: 'broadcast', event: 'ev', payload: msg }),
      leave: () => sb.removeChannel(ch),
      count: () => n,
      online: () => Object.keys(ch.presenceState()) // ids dos personagens conectados
    };
  }
};

function toRow(c, userId) { return { id: c.id, user_id: userId, name: c.name, class: c.cls, look: c.look, data: c.data, level: c.level, score: c.score, week_id: c.week_id, week_score: c.week_score }; }
function fromRow(r) { return { id: r.id, name: r.name, cls: r.class, look: r.look, data: r.data || {}, level: r.level, score: r.score, week_id: r.week_id, week_score: r.week_score }; }

function traduz(e) {
  const m = (e && e.message) || String(e);
  const map = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'User already registered': 'Esse e-mail já tem conta. Use "Entrar".',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).',
    'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.'
  };
  for (const k in map) if (m.includes(k)) return new Error(map[k]);
  return new Error(m);
}
