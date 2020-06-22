import MarkdownIt from 'markdown-it'
import MarkdownItKaTeX from 'markdown-it-katex'

import 'katex/dist/katex.min.css'

let md = new MarkdownIt({
  html: false,
  linkify: false
}).use(MarkdownItKaTeX, {
  "throwOnError" : false,
  "errorColor" : "#aa0000"
})

export default (text) => md.render(text)