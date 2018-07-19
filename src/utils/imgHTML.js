export const imgHTML = ({
    title,
    alt,
    srcFallback,
    base64,
    paddingBottom,
    presentationWidth,
}) =>
    `<cloud-image title="${title}" alt="${alt}" srcfallback="${srcFallback}" paddingbottom="${paddingBottom}" base64="${base64}" presentationwidth="${presentationWidth}"></cloud-image>`
