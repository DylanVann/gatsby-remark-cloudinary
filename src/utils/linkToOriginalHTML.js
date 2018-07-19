export const linkToOriginalHTML = ({ original, children }) => `
<a
  class="gatsby-resp-image-link"
  href="${original}"
  style="display: block"
  target="_blank"
  rel="noopener"
>
    ${children}
</a>
`
