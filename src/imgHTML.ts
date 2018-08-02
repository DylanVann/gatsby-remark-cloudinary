import {
    FastImageImageBestProps,
    FastImageVideoBestProps,
} from 'react-fast-image'
import dashify from 'dashify'

export default (
    props: FastImageImageBestProps | FastImageVideoBestProps,
): string => {
    let out = ''
    out += '<fast-image'
    for (let key in props) {
        if (props.hasOwnProperty(key)) {
            out += ` ${dashify(key)}="${(props as any)[key]}"`
        }
    }
    out += '></fast-image>'
    return out
}
