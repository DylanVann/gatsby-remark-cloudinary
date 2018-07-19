export const imgHTML = ({
    node,
    srcFallback,
    srcSet,
    sizes,
    base64,
    paddingBottom,
    presentationWidth
}) => `
<span
    class="gatsby-resp-image-wrapper"
    style="position: relative; display: block; max-width: ${presentationWidth}px; margin-left: auto; margin-right: auto;"
>
    <span
        class="gatsby-resp-image-background-image"
        style="padding-bottom: ${paddingBottom}; position: relative; bottom: 0; left: 0; background-image: url('${
        base64
        }'); background-size: cover; display: block;"
    >
        <img
            alt="${node.alt || ``}"
            title="${node.title || ``}"
            class="gatsby-resp-image-image"
            style="width: 100%; height: 100%; margin: 0; vertical-align: middle; position: absolute; top: 0; left: 0;"
            src="${srcFallback}"
        />
    </span>
</span>
`
