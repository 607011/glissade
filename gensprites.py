#!/usr/bin/env python3

import yaml
import io
import os
import base64
from PIL import Image

def main():
    with open('sprites.yaml', 'r') as file:
        config = yaml.safe_load(file)
    images = [{'name': img_file, 'data': Image.open(img_file)} for img_file in config['src']]
    if config['order'] == 'horizontally':
        width = sum([img['data'].size[0] for img in images])
        height = max([img['data'].size[1] for img in images])
    else:
        width = max([img['data'].size[0] for img in images])
        height = sum([img['data'].size[1] for img in images])
    result_img = Image.new('RGBA', (width, height))
    css = ''
    if config['order'] == 'horizontally':
        x = 0
        for img in images:
            print(f'''{img['name']}''')
            result_img.paste(img['data'], (x, 0))
            scale = img['data'].size[0] // config['tile']['width']
            css += f""".{os.path.splitext(os.path.basename(img['name']))[0]}{{background-position:{-x // scale}px 0}}\n"""
            x += img['data'].size[0]
    else:
        y = 0
        for img in images:
            print(f'''{img['name']}''')
            result_img.paste(img['data'], (0, y))
            scale = img['data'].size[1] // config['tile']['height']
            css += f""".{os.path.splitext(os.path.basename(img['name']))[0]}{{background-position:0 {-y // scale}px}}\n"""
            y += img['data'].size[1]

    if 'dst' in config:
        commonprefix = os.path.commonprefix([config['css'], config['dst']])
        sprite_url = os.path.relpath(config['dst'], commonprefix)
        result_img.save(config['dst'])
    else:
        png_data = io.BytesIO()
        result_img.save(png_data, 'PNG')
        sprite_url = f"""data:image/png;base64,{base64.b64encode(png_data.getvalue()).decode('utf-8')}"""
    css = f"""
.tile {{
    display: inline-block;
    width: {config['tile']['width']}px;
    height: {config['tile']['height']}px;
    position: relative;
    top: 0;
    left: 0;
    cursor: pointer;
    box-sizing: content-box;
    background-size: cover;
    background-repeat: no-repeat;
    background-image: url({sprite_url});
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    -ms-interpolation-mode: nearest-neighbor;
}}
{css}"""
    with open(config['output'], 'w+') as css_out:
        css_out.write(css)

    

if __name__ == '__main__':
    main()
