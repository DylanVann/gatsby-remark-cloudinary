export const captionHTML = ({ node, children }) => `
<figure class="gatsby-resp-image-figure">
    ${children}
    <figcaption class="gatsby-resp-image-figcaption">${node.title}</figcaption>
</figure>
`
