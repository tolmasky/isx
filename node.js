const node =
{
    keys: () => <run>{keys}</run>,

    install: ({ version = "10.15.0", destination, arch = process.arch }) =>
    [
        <node.keys/>,
        <run>
            {[
                `curl -SLO "https://nodejs.org/dist/v${version}/node-v${version}-linux-${arch}.tar.xz"`,
                `curl -SLO "https://nodejs.org/dist/v${version}/SHASUMS256.txt.asc"`,
                `gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc`,
                `grep " node-v${version}-linux-${arch}.tar.xz\\$" SHASUMS256.txt | sha256sum -c -`,
                `tar -xJf "node-v${version}-linux-${arch}.tar.xz" -C ${destination} --strip-components=1`,
                `rm "node-v${version}-linux-${arch}.tar.xz" SHASUMS256.txt.asc SHASUMS256.txt`
            ].join(" && ")}
        </run>
    ]
}

module.exports = node;

const keyservers =
[
    "hkps://keys.openpgp.org",
    "keyserver.ubuntu.com",
    "na.pool.sks-keyservers.net",
    "ha.pool.sks-keyservers.net",
    "pgp.mit.edu",
    "hkp://p80.pool.sks-keyservers.net:80",
    "hkp://keyserver.ubuntu.com:80",
    "keyserver.pgp.com"
];

const keys =
[
    "set -ex ",
    "  && for key in ",
    "    0034A06D9D9B0064CE8ADF6BF1747F4AD2306D93 ", // keybase.io/octetcloud, likely a former member member of Node release team
    "    56730D5401028683275BD23C23EFEFE93C4CFFFE ", // Italo A. Casas <me@italoacasas.com>, former member of Node release team
    "    9554F04D7259F04124DE6B476D5A82AC7E37093B ", // Chris Dickinson <christopher.s.dickinson@gmail.com>, former member of Node release team
    "    B9AE9905FFD7803F25714661B63B535A4C206CA9 ", // Evan Lucas <evanlucas@me.com>, former member of Node release team
    "    77984A986EBC2AA786BC0F66B01FBB92821C587A ", // Gibson Fahnestock <gibfahn@gmail.com>, former member of Node release team
    "    FD3A5288F042B6850C66B31F09FE44734EB7990E ", // Jeremiah Senkpiel <fishrock@keybase.io>, former member of Node release team
    "    93C7E9E91B49E432C2F75674B0A78B0A6C481CF6 ", // Isaac Z. Schlueter <i@izs.me>, former member of Node release team
    "    114F43EE0176B71C7BC219DD50A3051F888C628D ", // Julien Gilli <jgilli@fastmail.fm>, former member of Node release team
    "    7937DFD2AB06298B2293C3187D33FF9D0246406D ", // Timothy J Fontaine <tjfontaine@gmail.com>, former member of Node release team
    "    1C050899334244A8AF75E53792EF661D867B9DFA ", // Danielle Adams <adamzdanielle@gmail.com>, Node release team, prior to 01/09/21

    "    4ED778F539E3634C779C87C6D7062848A1AB005C ", // Beth Griggs <bgriggs@redhat.com>
    "    141F07595B7B3FFE74309A937405533BE57C7D57 ", // Bryan English <bryan@bryanenglish.com>
    "    94AE36675C464D64BAFA68DD7434390BDBE9B9C5 ", // Colin Ihrig <cjihrig@gmail.com>
    "    74F12602B6F1C4E913FAA37AD3A89613643B6201 ", // Danielle Adams <adamzdanielle@gmail.com>
    "    71DCFD284A79C3B38668286BC97EC7A07EDE3FC1 ", // James M Snell <jasnell@keybase.io>
    "    61FC681DFB92A079F1685E77973F295594EC4689 ", // Juan José Arboleda <soyjuanarbol@gmail.com> (old)
    "    DD792F5973C6DE52C432CBDAC77ABFA00DDBF2B7 ", // Juan José Arboleda <soyjuanarbol@gmail.com>
    "    8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600 ", // Michaël Zasso <targos@protonmail.com>
    "    C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8 ", // Myles Borins <myles.borins@gmail.com>
    "    890C08DB8579162FEE0DF9DB8BEAB4DFCF555EF4 ", // RafaelGSS <rafael.nunu@hotmail.com>
    "    C82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C ", // Richard Lau <rlau@redhat.com>
    "    DD8F2338BAE7501E3DD5AC78C273792F7D83545D ", // Rod Vagg <rod@vagg.org>
    "    A48C2BEE680E841632CD4E44F07496B3EB3C1762 ", // Ruben Bridgewater <ruben@bridgewater.de>
    "    108F52B48DB57BB0CC439B2997B01419BD92F80A ", // Ruy Adorno <ruyadorno@hotmail.com>
    "    B9E2F5981AA6E0CD28160D9FF13993A75599653C ", // Shelley Vohr <shelley.vohr@gmail.com>
    "  ; do ",
    `gpg --list-keys "$key" || ` +
    keyservers
        .map(keyserver =>
            `(gpg --keyserver ${keyserver} --recv-keys "$key" && gpg --list-keys "$key")`)
        .join(" || ") + ";",
     "  done"
].join(" ");
