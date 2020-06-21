import MarkdownIt from 'markdown-it'

let md = new MarkdownIt({
  html: false,
  linkify: false // avoid collision with text_splitter.js
})

export default (text) => md.render(text)