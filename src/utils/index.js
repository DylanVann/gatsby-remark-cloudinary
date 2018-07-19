const buildResponsiveSizes = async ({ metadata, imageUrl, options = {} }) => {
  const { width, height, density } = metadata
  const aspectRatio = width / height
  const pixelRatio =
    options.sizeByPixelDensity && typeof density === `number` && density > 0
      ? density / 72
      : 1

  const presentationWidth = Math.min(
    options.maxWidth,
    Math.round(width / pixelRatio)
  )
  const presentationHeight = Math.round(presentationWidth * (height / width))

  if (!options.sizes) {
    options.sizes = `(max-width: ${presentationWidth}px) 100vw, ${presentationWidth}px`
  }

  const images = []

  images.push(metadata.width / 4)
  images.push(metadata.width / 2)
  images.push(metadata.width)
  images.push(metadata.width * 1.5)
  images.push(metadata.width * 2)
  images.push(metadata.width * 3)

  const filteredSizes = images.filter(size => size < width)

  filteredSizes.push(width)

  const base64Img = await getBase64ImgFromUrl(`${imageUrl}?w=40`)

  const srcSet = filteredSizes
    .map(size => `${imageUrl}?w=${Math.round(size)} ${Math.round(size)}w`)
    .join(`,\n`)

  return {
    base64: base64Img,
    aspectRatio,
    srcSet,
    src: imageUrl,
    sizes: options.sizes,
    density,
    presentationWidth,
    presentationHeight,
  }
}

exports.buildResponsiveSizes = buildResponsiveSizes
exports.getBase64Img = getBase64ImgFromUrl
