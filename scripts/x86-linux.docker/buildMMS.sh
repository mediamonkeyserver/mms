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

 gcc '-DNODE_GYP_MODULE_NAME=sqlite3' '-DUSING_UV_SHARED=1' '-DUSING_V8_SHARED=1' '-DV8_DEPRECATION_WARNINGS=1' '-D_LARGEFILE_SOURCE' '-D_FILE_OFFSET_BITS=64' '-D_REENTRANT=1' '-DSQLITE_THREADSAFE=1' '-DSQLITE_ENABLE_FTS3' '-DSQLITE_ENABLE_FTS4' '-DSQLITE_ENABLE_FTS5' '-DSQLITE_ENABLE_JSON1' '-DSQLITE_ENABLE_RTREE' '-DNDEBUG' -I/root/.node-gyp/8.15.0/include/node -I/root/.node-gyp/8.15.0/src -I/root/.node-gyp/8.15.0/deps/openssl/config -I/root/.node-gyp/8.15.0/deps/openssl/openssl/include -I/root/.node-gyp/8.15.0/deps/uv/include -I/root/.node-gyp/8.15.0/deps/zlib -I/root/.node-gyp/8.15.0/deps/v8/include -I./Release/obj/gen/sqlite-autoconf-3260000  -std=c99 -pthread -Wall -Wextra -Wno-unused-parameter -m32 -O3 -fno-omit-frame-pointer  -MMD -MF ./Release/.deps/Release/obj.target/sqlite3/gen/sqlite-autoconf-3260000/sqlite3.o.d.raw -c -o Release/obj.target/sqlite3/gen/sqlite-autoconf-3260000/sqlite3.o Release/obj/gen/sqlite-autoconf-3260000/sqlite3.c

gcc '-DNODE_GYP_MODULE_NAME=sqlite3' '-DUSING_UV_SHARED=1' '-DUSING_V8_SHARED=1' '-DV8_DEPRECATION_WARNINGS=1' '-D_LARGEFILE_SOURCE' '-D_FILE_OFFSET_BITS=64' '-D_REENTRANT=1' '-DSQLITE_THREADSAFE=1' '-DSQLITE_ENABLE_FTS3' '-DSQLITE_ENABLE_FTS4' '-DSQLITE_ENABLE_FTS5' '-DSQLITE_ENABLE_JSON1' '-DSQLITE_ENABLE_RTREE' '-DNDEBUG' -std=c99 -pthread -Wall -Wextra -Wno-unused-parameter -m32 -O3 -fno-omit-frame-pointer  -MMD -MF ./sqlite3.o.d.raw -c -o sqlite3.o sqlite3.c

export CC="/CT/i686-QNAP-linux-gnu/cross-tools/bin/i686-QNAP-linux-gnu-gcc"
export CXX="/CT/i686-QNAP-linux-gnu/cross-tools/bin/i686-QNAP-linux-gnu-g++"
export LINK="/CT/i686-QNAP-linux-gnu/cross-tools/bin/i686-QNAP-linux-gnu-g++"
export SOLINK="/CT/i686-QNAP-linux-gnu/cross-tools/bin/i686-QNAP-linux-gnu-g++"


export CC="/opt/cross-project/x86/sys-root/usr/bin/gcc -I/opt/cross-project/x86/sys-root/usr/lib/gcc/i486-linux-gnu/4.1.2/include/"
export CXX="/opt/cross-project/x86/sys-root/usr/bin/g++ -I/opt/cross-project/x86/sys-root/usr/lib/gcc/i486-linux-gnu/4.1.2/include/"
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

cd /
mkdir sqlite
cd sqlite
npm install sqlite3 --build-from-source --target_arch=ia32

cd /
git clone https://github.com/mediamonkeyserver/mms.git
cd /mms
npm install
npm run buildUI
node node_modules/.bin/pkg -t node8-linux-x86 -o mms .
cp mms /buildTarget
cp -r node_modules/sqlite3/lib/binding/* /buildTarget