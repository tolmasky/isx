const image = require("@isx/build/image_");
const { copy, run } = require("@isx/build/instruction");

const tarname = version => `node-v${version}-linux-x64.tar.xz`;
const fs = require("fs");
const { join } = require("@parallel-branch/fs");
const required = (name, f) =>
    { throw TypeError(`${name} is required when calling ${f}`) }
const rversion = tag => required("version", `<node.${tag}/>`);


const node =
{
    keys: () => <run>{keys}</run>,

    tar ({ version })
    {
        const filename = tarname(version);
        const shasum = "SHASUMS256.txt";
        const versionURL = `https://nodejs.org/dist/v${version}`;

        return  <image tag = { `isx:node-${version}-tar` }
                       from = "buildpack-deps:jessie" >
                    <node.keys/>
                    <run>
                        {[
                            `curl -SLO "${versionURL}/${filename}"`,
                            `curl -SLO "${versionURL}/${shasum}.asc"`,
                            `gpg --batch --decrypt --output ${shasum} ${shasum}.asc`,
                            `grep " ${filename}\\$" ${shasum} | sha256sum -c -`
                        ].join(" && ")}
                    </run>
                </image>;
    },

    base: ({ version }) =>
        <image  tag = { `isx:node-${version}` }
                from = "buildpack-deps:jessie" >
            <node.install version = { version } />
        </image>,

    install: ({ version = rversion("install"), destination = "/usr/local" }) =>
    [
        <copy   from = { <node.tar version = { version } /> }
                source = { tarname(version) }
                destination = "/" />,
        <run>
        {[
            `tar -xJf "/${tarname(version)}" -C ${destination} --strip-components=1`,
            `rm "/${tarname(version)}"`
        ].join(" && ")}
        </run>
    ]
};

module.exports = node;

const keys =
[
    "set -ex ",
    "  && for key in ",
    "    0034A06D9D9B0064CE8ADF6BF1747F4AD2306D93 ", // keybase.io/octetcloud, likely a former member member of Node release team
    "    56730D5401028683275BD23C23EFEFE93C4CFFFE ", // Italo A. Casas <me@italoacasas.com>, former member of Node release team
    "    9554F04D7259F04124DE6B476D5A82AC7E37093B ", // Chris Dickinson <christopher.s.dickinson@gmail.com>, former member of Node release team
    "    4ED778F539E3634C779C87C6D7062848A1AB005C ", // Beth Griggs <bethany.griggs@uk.ibm.com>, Node release team
    "    94AE36675C464D64BAFA68DD7434390BDBE9B9C5 ", // Colin Ihrig <cjihrig@gmail.com>, Node release team
    "    FD3A5288F042B6850C66B31F09FE44734EB7990E ", // Jeremiah Senkpiel <fishrock@keybase.io>, Node release team
    "    71DCFD284A79C3B38668286BC97EC7A07EDE3FC1 ", // James M Snell <jasnell@keybase.io>, Node release team
    "    DD8F2338BAE7501E3DD5AC78C273792F7D83545D ", // Rod Vagg <rod@vagg.org>, Node release team
    "    B9AE9905FFD7803F25714661B63B535A4C206CA9 ", // Evan Lucas <evanlucas@me.com>, Node release team
    "    77984A986EBC2AA786BC0F66B01FBB92821C587A ", // Gibson Fahnestock <gibfahn@gmail.com>, Node release team
    "    C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8 ", // Myles Borins <myles.borins@gmail.com>, Node release team
    "    8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600 ", // Michaël Zasso <targos@protonmail.com>, Node release team
    "    A48C2BEE680E841632CD4E44F07496B3EB3C1762 ", // Ruben Bridgewater <ruben@bridgewater.de>, Node release team
    "    B9E2F5981AA6E0CD28160D9FF13993A75599653C ", // Shelley Vohr <shelley.vohr@gmail.com>, Node release team
    "  ; do ",
    "    gpg --keyserver na.pool.sks-keyservers.net --recv-keys \"$key\" || ",
    "    gpg --keyserver ha.pool.sks-keyservers.net --recv-keys \"$key\" || ",
    "    gpg --keyserver pgp.mit.edu --recv-keys \"$key\" || ",
    "    gpg --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys \"$key\" || ",
    "    gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys \"$key\" || ",
    "    gpg --keyserver keyserver.pgp.com --recv-keys \"$key\"; ",
    "  done"
].join(" ");
