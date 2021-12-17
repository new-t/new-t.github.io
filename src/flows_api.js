import { get_json, gen_name} from './infrastructure/functions';
import { API_BASE } from './Common';
import { cache } from './cache';

export { get_json };

const SEARCH_PAGESIZE = 50;

const handle_response = async (response, notify = false) => {
  let json = await get_json(response);
  if (json.code !== 0) {
    if (json.msg) {
      if (notify) alert(json.msg);
      else throw new Error(json.msg);
    } else throw new Error(JSON.stringify(json));
  }
  return json;
};

const parse_replies = (replies, color_picker) =>
  replies
    .sort((a, b) => parseInt(a.cid, 10) - parseInt(b.cid, 10))
    .map((info) => {
      info.name = gen_name(info.name_id);
      info._display_color = color_picker.get(info.name);
      info.variant = {};
      return info;
    });

export const API = {
  load_replies: async (pid, token, color_picker, cache_version) => {
    pid = parseInt(pid);
    let response = await fetch(
      API_BASE + '/getcomment?pid=' + pid ,
      {
        headers: {
          'User-Token': token,
        }
      }
    );
    let json = await handle_response(response);
    // Why delete then put ??
    //console.log('Put cache', json, pid, cache_version);
    cache().put(pid, cache_version, json);
    json.data = parse_replies(json.data, color_picker);
    return json;
  },

  load_replies_with_cache: async (pid, token, color_picker, cache_version) => {
    pid = parseInt(pid);
    let json = await cache().get(pid, cache_version);
    //console.log('Get Cache', json, pid, cache_version);
    if (json) {
      //console.log('cache.data', json.data);
      json.data = parse_replies(json.data, color_picker);
      return { data: json, cached: true };
    } else {
      //console.log('Cache fail, new fetch');
      json = await API.load_replies(pid, token, color_picker, cache_version);
      return { data: json, cached: !json };
    }
  },

  set_attention: async (pid, attention, token) => {
    let data = new URLSearchParams();
    data.append('pid', pid);
    data.append('switch', attention ? '1' : '0');
    let response = await fetch(
      API_BASE + '/attention',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Token': token,
        },
        body: data,
      },
    );
    // Delete cache to update `attention` on next reload
    cache().delete(pid);
    return handle_response(response, true);
  },

  report: async (pid, reason, token) => {
    let data = new URLSearchParams();
    data.append('pid', pid);
    data.append('reason', reason);
    let response = await fetch(
      API_BASE + '/report',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Token': token,
        },
        body: data,
      },
    );
    return handle_response(response, true);
  },

  del: async (type, id, note, token) => {
    let data = new URLSearchParams();
    data.append('type', type);
    data.append('id', id);
    data.append('note', note);
    let response = await fetch(
      API_BASE + '/delete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Token': token,
        },
        body: data,
      },
    );
    return handle_response(response, true);
  },

  update_cw: async (cw, id, token) => {
    let data = new URLSearchParams();
    data.append('cw', cw);
    data.append('pid', id);
    let response = await fetch(
      API_BASE + '/editcw',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Token': token,
        },
        body: data,
      },
    );
    return handle_response(response, true);
  },

  update_score: async (score, id, token) => {
    let data = new URLSearchParams();
    data.append('score', score);
    data.append('pid', id);
    let response = await fetch(
      API_BASE + '/update_score',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Token': token,
        },
        body: data,
      },
    );
    return handle_response(response, true);
  },

  get_list: async (page, token, submode) => {
    let response = await fetch(
      `${API_BASE}/getlist?p=${page}${
        window.config.no_c_post ? '&no_cw' : ''
      }&order_mode=${submode}`,
      {
        headers: {'User-Token': token},
      },
    );
    return handle_response(response);
  },

  get_search: async (page, keyword, token) => {
    let response = await fetch(
      API_BASE +
        '/search?pagesize=' +
        SEARCH_PAGESIZE +
        '&page=' +
        page +
        '&keywords=' +
        encodeURIComponent(keyword),
      {
        headers: {'User-Token': token},
      }
    );
    return handle_response(response);
  },

  get_single: async (pid, token) => {
    let response = await fetch(
      API_BASE + '/getone?pid=' + pid,
      {
        headers: {'User-Token': token},
      }
    );
    return handle_response(response);
  },

  get_attention: async (token) => {
    let response = await fetch(
      API_BASE + '/getattention',
      {
        headers: {'User-Token': token},
      }
    );
    return handle_response(response);
  },
};
