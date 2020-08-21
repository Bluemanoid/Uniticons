const http = require('https');
const fs = require('fs');
const svgexport = require('svgexport');
const temp = require('temp');
const path = require('path');
const process = require('process');
const unzip = require('unzipper');

Array.prototype.chunk = function(groupsize){
    var sets = [], chunks, i = 0;
    chunks = Math.ceil(this.length / groupsize);

    while(i < chunks){
        sets[i] = this.splice(0, groupsize);
	i++;
    }
    return sets;
};

const fa_version = '5.14.0';

async function main() {
    let temp_dir = await temp.mkdir('fontawesome5');
    await download_fontawesome(fa_version, temp_dir);
    await import_font_files(temp_dir);
    await convert_svg_to_png(temp_dir);
}

async function download_fontawesome(version, extract_dir) {
    const fa_url = `https://use.fontawesome.com/releases/v${fa_version}/fontawesome-free-${fa_version}-desktop.zip`;

    console.log("Downloading Font Awesome from " + fa_url + "...");

    let promise = new Promise((resolve, reject) => {
        http.get(fa_url, function(response) {
            let extract_stream = unzip.Extract({ path: extract_dir });
            response.pipe(extract_stream);

            extract_stream.on('close', () => {
                console.log("Done.");
                resolve();
            });
            extract_stream.on('error', (e) => {
                resolve(e);
            });
        }).on('error', (e) => {
            reject(e);
        });
    });

    return promise;
}

async function import_font_files(temp_dir) {

    console.log("Importing OTF font files...");

    const font_files = [
        {
            "input": "Font Awesome 5 Brands-Regular-400",
            "output": "FontAwesome-Brands",
        },
        {
            "input": "Font Awesome 5 Free-Regular-400",
            "output": "FontAwesome-Regular",
        },
        {
            "input": "Font Awesome 5 Free-Solid-900",
            "output": "FontAwesome-Solid",
        },
    ];

    const input_dir = path.join(temp_dir, `fontawesome-free-${fa_version}-desktop`, "otfs");

    for(font_file of font_files) {
        console.log("Copy " + path.join("otfs", font_file.input + ".otf") + " -> " + path.join("Fonts", font_file.output + ".otf"));
        fs.copyFileSync(path.join(input_dir, font_file.input + ".otf"), path.join(process.cwd(), "Fonts", font_file.output + ".otf"));
    }

    console.log("Done.");
}

async function convert_svg_to_png(temp_dir) {

    console.log("Converting icons from SVG to PNG...");

    const styles = [
        {
            "input": "brands",
            "output": "Brands",
            "prefix": "fab-",
        },
        {
            "input": "regular",
            "output": "Regular",
            "prefix": "far-",
        },
        {
            "input": "solid",
            "output": "Solid",
            "prefix": "fas-",
        },
    ];

    let svg_datafile = [];

    for (const style of styles) {
        const input_dir = path.join(temp_dir, `fontawesome-free-${fa_version}-desktop`, "svgs", style.input);
        const output_dir = path.join(process.cwd(), "Icons", style.output);

        const files = fs.readdirSync(input_dir);

        for (const filename of files) {
            svg_datafile.push({
                "input" : [path.join(input_dir, filename), "svg{fill:white;}", ":32"],
                "output": [path.join(output_dir, style.prefix + path.parse(filename).name + '.png')],
            });
        }
    }

    const chunk_size = 10;

    const l = svg_datafile.length;
    let chunks = svg_datafile.chunk(10);
    let i = 0;
    for(const chunk of chunks) {
        await svgexport.render(chunk);
        i++;
        console.log(i * 10 + " / " + l + " files processed.");
    }

    console.log("Done.");
}

main();
