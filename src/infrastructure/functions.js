export function get_json(res) {
    if(!res.ok) {
      return (
        res.text().then((t) => {
          console.log('error:', res);
          t = t.length < 100 ? t : '';
          throw Error(`${res.status} ${res.statusText} ${t}`);
        })
      );
    }
    return (
        res
            .text()
            .then((t)=>{
                try {
                    return JSON.parse(t);
                } catch(e) {
                    console.error('json parse error');
                    console.trace(e);
                    console.log(t);
                    throw new SyntaxError('JSON Parse Error '+t.substr(0,50));
                }
            })
    );
}

export function listen_darkmode(override) { // override: true/false/undefined
    function update_color_scheme() {
        if(override===undefined ? window.matchMedia('(prefers-color-scheme: dark)').matches : override)
            document.body.classList.add('root-dark-mode');
        else
            document.body.classList.remove('root-dark-mode');
    }

    update_color_scheme();
    window.matchMedia('(prefers-color-scheme: dark)').addListener(()=>{
        update_color_scheme();
    });
}

const NAMES = [
'Alice',
'Bob',
'Carol',
'Dave',
'Eve',
'Francis',
'Grace',
'Hans',
'Isabella',
'Jason',
'Kate',
'Louis',
'Margaret',
'Nathan',
'Olivia',
'Paul',
'Queen',
'Richard',
'Susan',
'Thomas',
'Uma',
'Vivian',
'Winnie',
'Xander',
'Yasmine',
'Zach'
]

export function gen_name(name_id) {
  if (name_id == 0)
    return '洞主';

  let r = name_id;
  let name = '';
  do {
    r -= 1;
    name += ' ' + NAMES[r % 26];
    r = parseInt(r / 26);
  } while (r);

  return name.substr(1);
}

