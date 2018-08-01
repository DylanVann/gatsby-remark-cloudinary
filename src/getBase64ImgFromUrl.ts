import axios from 'axios'

export const getBase64ImgFromUrl = async (url: string) => {
    const response = await axios({
        method: `GET`,
        responseType: `arraybuffer`,
        url: `${url}`,
    })

    const base64Img = `data:${
        response.headers[`content-type`]
    };base64,${new Buffer(response.data).toString(`base64`)}`

    return base64Img
}
