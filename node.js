const image = require("./image");
const playbook = image;
const tarname = version => `node-v${version}-linux-x64.tar.xz`;
const fs = require("fs");
const { join } = require("@cause/task/fs");

const node =
{
    keys: () => <run>{keys}</run>,

    image: ({ version }) =>
        <image tag = { `node-${version}` } from = "buildpack-deps:jessie" >
            <node.keys/>
            <run>
                {[
                    `curl -SLO "https://nodejs.org/dist/v${version}/${tarname(version)}"`,
                    `curl -SLO "https://nodejs.org/dist/v${version}/SHASUMS256.txt.asc"`,
                    `gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc`,
                    `grep " ${tarname(version)}\\$" SHASUMS256.txt | sha256sum -c -`
                ].join(" && ")}
            </run>
        </image>,

    install: ({ version, destination = "/usr/local" }) => [
        <copy   from = { <node.image version = { version } /> }
                source = { `node-v${version}-linux-x64.tar.xz` }
                destination = "/" />,
        <run>
        {[
            `tar -xJf "/${tarname(version)}" -C ${destination} --strip-components=1`,
            `rm "/${tarname(version)}"`
        ].join(" && ")}
        </run>
    ],

    npm:
    {
        install: ({ source, destination, version }) =>
            <copy   from = { <node.npm.install.playbook
                                { ...{ source, version } } /> }
                    source = "app/node_modules"
                    destination = { (console.log(version + "-->" + destination + "/"), join(destination, "/")) } />
    }
}


node.npm.install.playbook = function ({ version, source })
{
    const packageJSON = require(`${source}/package.json`);
    const dependencies = packageJSON.dependencies || { };

    if (Object.keys(dependencies).length <= 0)
        return false;

    const name = "ephemeral-dependencies-package";
    const description = `Just the dependencies.`;
    const abbreviatedPackage = { name, description, dependencies, private: true };
    const abbreviatedJSON = JSON.stringify(JSON.stringify(abbreviatedPackage));
    const hasShrinkwrap = fs.existsSync(`${source}/npm-shrinkwrap.json`);

    return  <playbook from = "buildpack-deps:jessie" tag = "BUILDING-2" >
                <node.install version = { version }/>

                <run>mkdir app</run>
                <run>{`echo ${abbreviatedJSON} > app/package.json`}</run>

                {   hasShrinkwrap &&
                    <copy
                        source = { `${source}/npm-shrinkwrap.json` }
                        destination = "app/npm-shrinkwrap.json" />
                }

                <run>{`cd /app && npm install`}</run>
            </playbook>;
}



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
