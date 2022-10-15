import { get_json, gen_name } from './infrastructure/functions';
import { get_api_base, get_api_base_2 } from './Common';
import { cache } from './cache';

export { get_json };

const SEARCH_PAGESIZE = 50;

const handle_response = async (response, notify = false) => {
  let json = await get_json(response);
  if (json.code !== 0) {
    if (json.msg) {
      if (notify) {
        alert(json.msg);
      } else {
        throw new Error(json.msg);
      }
    } else {
      throw new Error(JSON.stringify(json));
    }
  }
  return json;
};

export const parse_replies = (replies, color_picker) =>
  replies
    .sort((a, b) => parseInt(a.cid, 10) - parseInt(b.cid, 10))
    .map((info) => {
      info.name = gen_name(info.name_id);
      info._display_color = color_picker.get(info.name, info.is_tmp);
      info.variant = {};
      return info;
    });

export const API = {
  load_replies: async (pid, token, color_picker, cache_version) => {
    pid = parseInt(pid);
    let response = await fetch(get_api_base() + '/getcomment?pid=' + pid, {
      headers: {
        'User-Token': token,
      },
    });
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
    let response = await fetch(get_api_base() + '/attention', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Token': token,
      },
      body: data,
    });
    // Delete cache to update `attention` on next reload
    cache().delete(pid);
    return handle_response(response, false);
  },

  set_notification: async (pid, enable, endpoint, auth, p256dh, token) => {
    let data = new URLSearchParams([
      ['enable', enable],
      ['endpoint', endpoint],
      ['auth', auth],
      ['p256dh', p256dh],
    ]);

    let response = await fetch(`${get_api_base_2()}/post/${pid}/notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Token': token,
      },
      body: data,
    });

    return handle_response(response, true);
  },

  set_reaction: async (pid, reaction_status, token) => {
    let data = new URLSearchParams([['status', reaction_status]]);

    let response = await fetch(`${get_api_base_2()}/post/${pid}/reaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Token': token,
      },
      body: data,
    });

    return handle_response(response, true);
  },

  report: async (pid, reason, should_hide, token) => {
    let data = new URLSearchParams([
      ['pid', pid],
      ['reason', reason],
    ]);
    if (should_hide) {
      data.append('should_hide', 1);
    }
    let response = await fetch(get_api_base() + '/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Token': token,
      },
      body: data,
    });
    return handle_response(response, false);
  },

  block: async (type, id, token) => {
    let data = new URLSearchParams([
      ['type', type],
      ['id', id],
    ]);
    let response = await fetch(get_api_base() + '/block', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Token': token,
      },
      body: data,
    });
    return handle_response(response, false);
  },

  del: async (type, id, note, token) => {
    let data = new URLSearchParams();
    data.append('type', type);
    data.append('id', id);
    data.append('note', note);
    let response = await fetch(get_api_base() + '/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Token': token,
      },
      body: data,
    });
    return handle_response(response, false);
  },

  update_cw: async (cw, id, token) => {
    let data = new URLSearchParams();
    data.append('cw', cw);
    data.append('pid', id);
    let response = await fetch(get_api_base() + '/editcw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Token': token,
      },
      body: data,
    });
    return handle_response(response, false);
  },

  get_list: async (page, token, submode) => {
    let response = await fetch(
      `${get_api_base()}/getlist?p=${page}&order_mode=${submode}&room_id=${
        window.config.show_all_rooms ? '' : window.config.room
      }`,
      {
        headers: { 'User-Token': token },
      },
    );
    return handle_response(response);
  },

  get_search: async (page, keyword, token, submode) => {
    let response = await fetch(
      `${get_api_base()}/search?search_mode=${submode}&page=${page}&room_id=${
        window.config.show_all_rooms ? '' : window.config.room
      }&keywords=${encodeURIComponent(keyword)}&pagesize=${SEARCH_PAGESIZE}`,
      {
        headers: { 'User-Token': token },
      },
    );
    return handle_response(response);
  },

  get_single: async (pid, token) => {
    let response = await fetch(get_api_base() + '/getone?pid=' + pid, {
      headers: { 'User-Token': token },
    });
    return handle_response(response);
  },

  get_attention: async (token) => {
    let response = await fetch(get_api_base() + '/getattention', {
      headers: { 'User-Token': token },
    });
    return handle_response(response);
  },

  add_vote: async (vote, pid, token) => {
    let data = new URLSearchParams([
      ['vote', vote],
      ['pid', pid],
    ]);
    let response = await fetch(get_api_base() + '/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Token': token,
      },
      body: data,
    });
    return handle_response(response, true);
  },

  get_multi: async (pids, token) => {
    let response = await fetch(
      get_api_base() +
        '/getmulti?' +
        pids.map((pid) => `pids=${pid}`).join('&'),
      {
        headers: {
          'User-Token': token,
        },
      },
    );
    return handle_response(response, true);
  },

  set_title: async (title, token) => {
    console.log('title: ', title);
    let data = new URLSearchParams([['title', title]]);
    let response = await fetch(get_api_base() + '/title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Token': token,
      },
      body: data,
    });
    return handle_response(response, true);
  },
};
