#! /bin/bash
# Experiments to build MMS for old 32-bit linux QNAP NAS (Peke has one)
# I succeeded in node.js compilation, but couldn't get a node_sqlite3 build that would work there (attempts for a fully static build unsuccessful)

cd ~
curl -sL https://deb.nodesource.com/setup_8.x | bash -
apt-get install -y nodejs

#build node
# ./configure --fully-static
# make

# apt install gcc-3.4 g++-3.4

export CC="/CT/i686-QNAP-linux-gnu/cross-tools/bin/i686-QNAP-linux-gnu-gcc"
export CXX="/CT/i686-QNAP-linux-gnu/cross-tools/bin/i686-QNAP-linux-gnu-g++"
export LINK="/CT/i686-QNAP-linux-gnu/cross-tools/bin/i686-QNAP-linux-gnu-g++"
export SOLINK="/CT/i686-QNAP-linux-gnu/cross-tools/bin/i686-QNAP-linux-gnu-g++"


export CC="/opt/cross-project/x86/sys-root/usr/bin/gcc"
export CXX="/opt/cross-project/x86/sys-root/usr/bin/g++"
export LINK="/opt/cross-project/x86/sys-root/usr/bin/g++"
export SOLINK="/opt/cross-project/x86/sys-root/usr/bin/g++"


export CXXFLAGS="-static-libgcc -static -v -std=c++0x -static-libstdc++"
export CPPFLAGS="-static-libgcc -static -v -std=c++0x -static-libstdc++"
export CFLAGS="-static-libgcc -static -v -std=c++0x -static-libstdc++"
export CCFLAGS="-static-libgcc -static -v -std=c++0x -static-libstdc++"

export CXXFLAGS="-static-libgcc"
export CPPFLAGS="-static-libgcc"
export CFLAGS="-static-libgcc"
export CCFLAGS="-static-libgcc"

export CXXFLAGS=""
export CPPFLAGS=""
export CFLAGS=""
export CCFLAGS=""

export CXX=g++-4.8
export CC=gcc-4.8

export CXX=g++
export CC=gcc
npm install sqlite3 --build-from-source --verbose

cd /
git clone https://github.com/mediamonkeyserver/mms.git
cd /mms
npm install
npm run buildUI
node node_modules/.bin/pkg -t node8-linux-x86 -o mms .
cp mms /buildTarget
cp -r node_modules/sqlite3/lib/binding/* /buildTarget