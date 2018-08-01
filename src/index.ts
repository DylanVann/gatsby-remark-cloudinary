import { getBase64ImgFromUrl } from './getBase64ImgFromUrl'
import imgHTML from './imgHTML'
const cloudinary = require('cloudinary')
const slash = require(`slash`)
const crypto = require(`crypto`)
const path = require(`path`)
const select = require(`unist-util-select`)
const md5File = require('md5-file/promise')
const _ = require(`lodash`)
import { uploadOrGetMetadata } from 'cloudinary-promised'
import {
    FastImageVideoBestProps,
    FastImageImageBestProps,
} from '../node_modules/react-fast-image'

const defaults = {
    maxWidth: 650,
    base64Width: 10,
    wrapperStyle: ``,
    backgroundColor: `white`,
    linkImagesToOriginal: false,
    showCaptions: false,
}

// Gets the imageNode containing info like the absolutePath.
const getImageNode = ({ node, files, parentNode }) => {
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
const getCacheKey = async ({
    path,
    options,
    fileName,
}: {
    path: string
    options: any
    fileName: string
}) => {
    const optionsHash = crypto
        .createHash(`md5`)
        .update(JSON.stringify(options))
        .digest('hex')
    const contentsHash = await md5File(path)
    return `remark-images-cloudinary-${fileName}-${optionsHash}-${contentsHash}`
}

// Returns the html for a markdown media node.
const htmlForNode = async function({
    node,
    files,
    imageNode,
    cloudinaryConfig,
    options,
}) {
    const absolutePath = imageNode.absolutePath
    const id = await md5File(absolutePath)

    // Uploading to cloudinary, or just getting dimensions if it's already there.
    const file = await uploadOrGetMetadata(id, absolutePath, cloudinaryConfig)

    // Original width and height.
    const { width, height } = file

    // The width this media will be shown at.
    // Min of max width and actual width.
    const presentationWidth = Math.min(options.maxWidth, width)

    let rawHTML

    const isVideo = absolutePath.endsWith('.mp4')
    if (isVideo) {
        const videoPosterSrc = `https://res.cloudinary.com/${
            cloudinaryConfig.cloud_name
        }/video/upload/w_${presentationWidth}/${id}.jpg`
        const videoPosterWebPSrc = videoPosterSrc.replace('.jpg', '.webp')
        const videoSrc = `https://res.cloudinary.com/${
            cloudinaryConfig.cloud_name
        }/video/upload/w_${presentationWidth}/${id}.mp4`

        // Base64 version of the poster.
        const base64Url = `https://res.cloudinary.com/${
            cloudinaryConfig.cloud_name
        }/video/upload/w_${options.base64Width}/${id}.png`

        const videoPosterBase64 = await getBase64ImgFromUrl(base64Url)

        const props: FastImageVideoBestProps = {
            videoSrc,
            videoPosterSrc,
            videoPosterWebPSrc,
            videoPosterBase64,
            width,
            height,
        }
        rawHTML = imgHTML(props)
    } else {
        // Responsive image sources
        const imgSrcSet = ''
        const imgWebPSrcSet = ''

        // The sizes.
        const imgSizes = `(max-width: ${presentationWidth}px) 100vw, ${presentationWidth}px`

        // Fallback src for max width.
        const imgSrc = `https://res.cloudinary.com/${
            cloudinaryConfig.cloud_name
        }/image/upload/w_${presentationWidth}/${id}.jpg`
        const imgWebPSrc = imgSrc.replace('.jpg', '.webp')

        // Base64 version of the image.
        const base64Url = `https://res.cloudinary.com/${
            cloudinaryConfig.cloud_name
        }/image/upload/w_${options.base64Width}/${id}.jpg`
        const imgBase64 = await getBase64ImgFromUrl(base64Url)

        const props: FastImageImageBestProps = {
            imgAlt: node.alt,
            imgSrc,
            imgWebPSrc,
            imgSrcSet,
            imgWebPSrcSet,
            imgBase64,
            imgSizes,
            width,
            height,
        }
        rawHTML = imgHTML(props)
    }

    return rawHTML
}

const cachedHtmlForNode = async ({
    node,
    files,
    cache,
    parentNode,
    cloudinaryConfig,
    options,
}) => {
    const srcSplit = node.url.split(`/`)
    const fileName = srcSplit[srcSplit.length - 1]

    const imageNode = getImageNode({ node, files, parentNode })
    if (!imageNode) return
    const absolutePath = imageNode.absolutePath

    const cacheKey = await getCacheKey({
        path: absolutePath,
        options,
        fileName,
    })
    const cachedRawHTML = await cache.get(cacheKey)
    if (cachedRawHTML) {
        return cachedRawHTML
    }

    const result = await htmlForNode({
        node,
        files,
        imageNode,
        cloudinaryConfig,
        options,
    })
    await cache.set(cacheKey, result)
    return result
}

module.exports = async (
    { files, markdownNode, markdownAST, pathPrefix, getNode, reporter, cache },
    pluginOptions,
) => {
    const options = _.defaults(pluginOptions, defaults, { pathPrefix })

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
        node =>
            new Promise(resolve => {
                cachedHtmlForNode({
                    node,
                    files,
                    cache,
                    parentNode,
                    cloudinaryConfig,
                    options,
                }).then(html => {
                    // Replace the image node with an inline HTML node.
                    node.type = `html`
                    node.value = html
                    resolve(node)
                })
            }),
    )

    return Promise.all(promises).then(nodes => nodes.filter(node => !!node))
}
