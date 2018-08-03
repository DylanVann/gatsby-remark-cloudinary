import imgHTML from './imgHTML'
import { getData } from '@dylanvann/gatsby-cloudinary'
const slash = require(`slash`)
const crypto = require(`crypto`)
const path = require(`path`)
const select = require(`unist-util-select`)
const md5File = require('md5-file/promise')
const _ = require(`lodash`)

interface PluginOptions {
    maxWidth?: number
    cloudName: string
    apiKey: string
    apiSecret: string
}

interface Node {
    parent: Node
    type: string
    value: string
    url: string
    dir: string
    absolutePath: string
}

interface File {
    absolutePath: string
}

interface Cache {
    set: (key: string, value: any) => any
    get: (key: string) => Promise<string | null>
}

// Gets the imageNode containing info like the absolutePath.
const getImageNode = ({
    node,
    files,
    parentNode,
}: {
    node: Node
    files: File[]
    parentNode: Node
}) => {
    const imagePath = slash(path.join(parentNode.dir, node.url))
    const imageNode = _.find(files, (file: File) => {
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
    pluginOptions,
}: {
    path: string
    pluginOptions: PluginOptions
}) => {
    const optionsHash = crypto
        .createHash(`md5`)
        .update(JSON.stringify(pluginOptions))
        .digest('hex')
    const contentsHash = await md5File(path)
    return `remark-images-cloudinary-${optionsHash}-${contentsHash}`
}

// Returns the html for a markdown media node.
const htmlForNode = async function({
    imageNode,
    pluginOptions,
}: {
    imageNode: Node
    pluginOptions: PluginOptions
}) {
    const absolutePath = imageNode.absolutePath
    const props = await getData({
        path: absolutePath,
        maxWidth: pluginOptions.maxWidth,
        config: {
            api_key: pluginOptions.apiKey,
            api_secret: pluginOptions.apiSecret,
            cloud_name: pluginOptions.cloudName,
        },
    })
    const rawHTML = imgHTML(props)
    return rawHTML
}

const cachedHtmlForNode = async ({
    node,
    files,
    cache,
    parentNode,
    pluginOptions,
}: {
    node: Node
    files: File[]
    cache: Cache
    parentNode: Node
    pluginOptions: PluginOptions
}): Promise<string | undefined> => {
    const imageNode = getImageNode({ node, files, parentNode })
    if (!imageNode) return
    const path = imageNode.absolutePath
    const cacheKey = await getCacheKey({
        path,
        pluginOptions,
    })

    const cachedRawHTML = await cache.get(cacheKey)
    if (cachedRawHTML) {
        return cachedRawHTML
    }

    const result = await htmlForNode({
        imageNode,
        pluginOptions,
    })
    await cache.set(cacheKey, result)
    return result
}

module.exports = async (
    {
        files,
        markdownNode,
        markdownAST,
        getNode,
        cache,
    }: {
        files: File[]
        markdownNode: Node
        markdownAST: any
        getNode: any
        cache: Cache
    },
    pluginOptions: PluginOptions,
) => {
    // This will only work for markdown syntax image tags
    const markdownImageNodes = select(markdownAST, `image`)

    if (markdownImageNodes.length === 0) return

    const parentNode = getNode(markdownNode.parent)
    if (!parentNode || !parentNode.dir) return null

    const promises = markdownImageNodes.map(
        (node: Node) =>
            new Promise((resolve, reject) => {
                cachedHtmlForNode({
                    node,
                    files,
                    cache,
                    parentNode,
                    pluginOptions,
                })
                    .then((html: string | undefined) => {
                        if (!html) return
                        // Replace the image node with an inline HTML node.
                        node.type = `html`
                        node.value = html
                        resolve(node)
                    })
                    .catch(e => reject(e))
            }),
    )

    return Promise.all(promises).then(nodes => nodes.filter(node => !!node))
}
