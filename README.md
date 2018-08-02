# @dylanvann/gatsby-remark-cloudinary

Proccesses images in Gatsby's remark using Cloudinary.

Creates `<fast-image>` tags from images in markdown.

## Install

```bash
npm install @dylanvann/gatsby-remark-cloudinary
# or
yarn add @dylanvann/gatsby-remark-cloudinary
```

## Usage

```js
// gatsby-config.js
module.exports = {
    plugins: [
        {
            resolve: '@dylanvann/gatsby-transformer-cloudinary',
            options: {
                cloudName: '...',
                apiKey: '...',
                apiSecret: '...',
            },
        },
    ],
}
```