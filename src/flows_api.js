import { get_json} from './infrastructure/functions';
import { API_BASE } from './Common';
import { cache } from './cache';

export function token_param(token) {
  return token ? '?user_token=' + token : '?notoken';
}

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
      info._display_color = color_picker.get(info.name);
      info.variant = {};
      return info;
    });

export const API = {
  load_replies: async (pid, token, color_picker, cache_version) => {
    pid = parseInt(pid);
    let response = await fetch(
      API_BASE + '/getcomment' + token_param(token) + '&pid=' + pid ,
    );
    let json = await handle_response(response);
    // Why delete then put ??
    cache().put(pid, cache_version, json);
    json.data = parse_replies(json.data, color_picker);
    return json;
  },

  load_replies_with_cache: async (pid, token, color_picker, cache_version) => {
    pid = parseInt(pid);
    let json = await cache().get(pid, cache_version);
    if (json) {
      json.data = parse_replies(json.data, color_picker);
      return { data: json, cached: true };
    } else {
      json = await API.load_replies(pid, token, color_picker, cache_version);
      return { data: json, cached: !json };
    }
  },

  set_attention: async (pid, attention, token) => {
    let data = new URLSearchParams();
    data.append('user_token', token);
    data.append('pid', pid);
    data.append('switch', attention ? '1' : '0');
    let response = await fetch(
      API_BASE + '/attention' + token_param(token),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
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
    data.append('user_token', token);
    data.append('pid', pid);
    data.append('reason', reason);
    let response = await fetch(
      API_BASE + '/report' + token_param(token),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data,
      },
    );
    return handle_response(response, true);
  },

  get_list: async (page, token) => {
    let response = await fetch(
      API_BASE + '/getlist' + token_param(token) + '&p=' + page,
    );
    return handle_response(response);
  },

  get_search: async (page, keyword, token) => {
    let response = await fetch(
      API_BASE +
        '/search' +
        token_param(token) +
        '&pagesize=' +
        SEARCH_PAGESIZE +
        '&page=' +
        page +
        '&keywords=' +
        encodeURIComponent(keyword)
    );
    return handle_response(response);
  },

  get_single: async (pid, token) => {
    let response = await fetch(
      API_BASE + '/getone' + token_param(token) + '&pid=' + pid,
    );
    return handle_response(response);
  },

  get_attention: async (token) => {
    let response = await fetch(
      API_BASE + '/getattention' + token_param(token),
    );
    return handle_response(response);
  },
};
