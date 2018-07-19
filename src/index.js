import {captionHTML} from "./utils/captionHTML";
import {getBase64ImgFromUrl} from "./utils/getBase64ImgFromUrl";
import {imgHTML} from "./utils/imgHTML";
import {linkToOriginalHTML} from "./utils/linkToOriginalHTML";

const cloudinary = require('cloudinary')
const slash = require(`slash`)
const crypto = require(`crypto`)
const path = require(`path`)
const select = require(`unist-util-select`)
const md5File = require('md5-file/promise')
const _ = require(`lodash`)
const Promise = require(`bluebird`)
import {uploadOrGetMetadata} from 'cloudinary-promised'
import {videoHTML} from "./utils/videoHTML";

const defaults = {
    maxWidth: 650,
    wrapperStyle: ``,
    backgroundColor: `white`,
    linkImagesToOriginal: false,
    showCaptions: false,
}

// Gets the imageNode containing info like the absolutePath.
const getImageNode = ({node, files, parentNode}) => {
    const imagePath = slash(path.join(parentNode.dir, node.url))
    const imageNode = _.find(files, file => {
        if (file && file.absolutePath) {
            return file.absolutePath === imagePath
        }
        return null
    })
    if (!imageNode || !imageNode.absolutePath) {
        return null
    }
    return imageNode
}

// Gets a cache key that is unique for a given image and set of options.
const getCacheKey = async ({path, options, fileName}) => {
    const optionsHash = crypto
        .createHash(`md5`)
        .update(JSON.stringify(options))
        .digest('hex')
    const contentsHash = await md5File(path)
    return `remark-images-cloudinary-${fileName}-${optionsHash}-${contentsHash}`
}

// Returns the html for a markdown media node.
const htmlForNode = async function ({node, files, cacheKey, imageNode, cloudinaryConfig, options}) {
    const absolutePath = imageNode.absolutePath

    // Uploading to cloudinary, or just getting dimensions if it's already there.
    const file = await uploadOrGetMetadata(cacheKey, absolutePath, cloudinaryConfig)

    const {
        width,
        height,
    } = file

    // Will be used go reserve space for the media.
    const aspectRatio = width / height

    // Calculate the paddingBottom %.
    const paddingBottom = `${(1 / aspectRatio) * 100}%`

    // The original src. Used as a fallback.
    const fullSizeSrc = file.secure_url

    // The width this media will be shown at.
    // Min of max width and actual width.
    const presentationWidth = Math.min(options.maxWidth, width)

    let rawHTML

    const isVideo = absolutePath.endsWith('.mp4')
    if (isVideo) {
        const srcVideoPoster = `https://res.cloudinary.com/${
            cloudinaryConfig.cloud_name
            }/video/upload/w_${presentationWidth}/${cacheKey}.jpg`
        const srcVideo = `https://res.cloudinary.com/${
            cloudinaryConfig.cloud_name
            }/video/upload/w_${presentationWidth}/${cacheKey}.mp4`

        // Base64 version of the poster.
        const base64Url = `https://res.cloudinary.com/${
            cloudinaryConfig.cloud_name
            }/video/upload/w_40/${cacheKey}.png`

        const base64 = await getBase64ImgFromUrl(base64Url)

        rawHTML = videoHTML({
            srcVideo,
            srcVideoPoster,
            base64,
            paddingBottom,
            presentationWidth
        })
    } else {
        // Responsive image sources
        const srcSet = ''

        // The sizes.
        const sizes = `(max-width: ${presentationWidth}px) 100vw, ${presentationWidth}px`

        // Fallback src for max width.
        const srcFallback = `https://res.cloudinary.com/${
            cloudinaryConfig.cloud_name
            }/image/upload/w_${presentationWidth}/${cacheKey}.jpg`

        // Base64 version of the image.
        const base64Url = `https://res.cloudinary.com/${
            cloudinaryConfig.cloud_name
            }/image/upload/w_40/${cacheKey}.jpg`
        const base64 = await getBase64ImgFromUrl(base64Url)

        // Construct new image node w/ aspect ratio placeholder
        rawHTML = imgHTML({
            node,
            srcFallback,
            srcSet,
            base64,
            sizes,
            paddingBottom,
            presentationWidth,
        })
    }

    // Make linking to original image optional.
    if (options.linkImagesToOriginal) {
        rawHTML = linkToOriginalHTML({
            original: fullSizeSrc,
            children: rawHTML,
        })
    }

    // Wrap in figure and use title as caption
    if (options.showCaptions && node.title) {
        rawHTML = captionHTML({
            node,
            children: rawHTML,
        })
    }

    return rawHTML
}

const cachedHtmlForNode = async ({node, files, cache, parentNode, cloudinaryConfig, options}) => {
    const srcSplit = node.url.split(`/`)
    const fileName = srcSplit[srcSplit.length - 1]

    const imageNode = getImageNode({node, files, parentNode})
    if (!imageNode) return
    const absolutePath = imageNode.absolutePath

    const cacheKey = await getCacheKey({path: absolutePath, options, fileName})
    const cachedRawHTML = await cache.get(cacheKey)
    if (cachedRawHTML) {
        return cachedRawHTML
    }

    const result = await htmlForNode({node, files, cacheKey, imageNode, cloudinaryConfig, options})
    await cache.set(cacheKey, result)
    return result
}

module.exports = async (
    {files, markdownNode, markdownAST, pathPrefix, getNode, reporter, cache},
    pluginOptions
) => {
    const options = _.defaults(pluginOptions, defaults, {pathPrefix})

    const cloudinaryConfig = {
        cloud_name: pluginOptions.cloudName,
        api_key: pluginOptions.apiKey,
        api_secret: pluginOptions.apiSecret,
    }

    cloudinary.config(cloudinaryConfig)

    // This will only work for markdown syntax image tags
    const markdownImageNodes = select(markdownAST, `image`)

    if (markdownImageNodes.length === 0) return

    const parentNode = getNode(markdownNode.parent)
    if (!parentNode || !parentNode.dir) return null

    const promises = markdownImageNodes.map(
        node => new Promise((resolve) => {
            cachedHtmlForNode({node, files, cache, parentNode, cloudinaryConfig, options}).then((html => {
                // Replace the image node with an inline HTML node.
                node.type = `html`
                node.value = html
                resolve(node)
            }))
        })
    )

    return Promise.all(promises).then(nodes => nodes.filter(node => !!node))
}
