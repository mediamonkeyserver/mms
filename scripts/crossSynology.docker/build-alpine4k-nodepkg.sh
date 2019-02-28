#! /bin/bash
# Based on info from: https://chrislea.com/2018/08/20/cross-compiling-node-js-for-arm-on-ubuntu/
# JH: Not working yet, as the toolchain is old and doesn't compile node.js sucessfully

export CC="/synotoolkit/build_env/ds.alpine4k-6.2/usr/local/arm-unknown-linux-gnueabi/bin/arm-unknown-linux-gnueabi-gcc -I/synotoolkit/build_env/ds.alpine4k-6.2/usr/local/arm-linux-gnueabihf/arm-linux-gnueabihf/libc/usr/include/arm-linux-gnueabi"
export CXX="/synotoolkit/build_env/ds.alpine4k-6.2/usr/local/arm-unknown-linux-gnueabi/bin/arm-unknown-linux-gnueabi-g++ -I/synotoolkit/build_env/ds.alpine4k-6.2/usr/local/arm-linux-gnueabihf/arm-linux-gnueabihf/libc/usr/include/arm-linux-gnueabi"
export LINK="/synotoolkit/build_env/ds.alpine4k-6.2/usr/local/arm-unknown-linux-gnueabi/bin/arm-unknown-linux-gnueabi-g++"
export SOLINK="/synotoolkit/build_env/ds.alpine4k-6.2/usr/local/arm-unknown-linux-gnueabi/bin/arm-unknown-linux-gnueabi-g++"
export SOLINK_MODULE="/synotoolkit/build_env/ds.alpine4k-6.2/usr/local/arm-unknown-linux-gnueabi/bin/arm-unknown-linux-gnueabi-g++"
export AS="/synotoolkit/build_env/ds.alpine4k-6.2/usr/local/arm-unknown-linux-gnueabi/bin/arm-unknown-linux-gnueabi-as"
export AR="/synotoolkit/build_env/ds.alpine4k-6.2/usr/local/arm-unknown-linux-gnueabi/bin/arm-unknown-linux-gnueabi-ar"

export CC_host="gcc -m32"
export CXX_host="g++ -m32" 
export LINK_host="g++ -m32" 
export SOLINK_host="g++ -m32" 
export SOLINK_MODULE_host="g++ -m32"

#export CXXFLAGS="-isystem /synotoolkit/build_env/ds.alpine4k-6.2/usr/local/arm-linux-gnueabihf/arm-linux-gnueabihf/libc/usr/include/arm-linux-gnueabi -L/synotoolkit/build_env/ds.alpine4k-6.2/usr/local/arm-linux-gnueabihf/arm-linux-gnueabihf/libc/usr/lib/arm-linux-gnueabihf"

/synotoolkit/build_env/ds.alpine4k-6.2/usr/local/arm-linux-gnueabihf/arm-linux-gnueabihf/libc/usr/include/arm-linux-gnueabi

cd /
git clone https://github.com/nodejs/node.git
cd /node
git checkout v8.11.3
wget https://raw.githubusercontent.com/zeit/pkg-fetch/master/patches/node.v8.11.3.cpp.patch
git apply node.v8.11.3.cpp.patch
/bin/bash ./configure --prefix=../install --dest-cpu=arm --cross-compiling --dest-os=linux --with-arm-float-abi=hard --with-arm-fpu=neon
make
cp out/Release/node /nodepkg/node-arm64-rtd1296-synology