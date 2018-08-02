import {
    FastImageImageBestProps,
    FastImageVideoBestProps,
} from 'react-fast-image'

export default (
    props: FastImageImageBestProps | FastImageVideoBestProps,
): string => {
    let out = ''
    out += '<fast-image'
    for (let key in props) {
        if (props.hasOwnProperty(key)) {
            out += ` ${key.toLowerCase()}="${(props as any)[key]}"`
        }
    }
    out += '></fast-image>'
    return out
}
