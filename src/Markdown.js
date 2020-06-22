import MarkdownIt from 'markdown-it'

let md = new MarkdownIt({
  html: false,
  linkify: false
})

export default (text) => md.render(text)