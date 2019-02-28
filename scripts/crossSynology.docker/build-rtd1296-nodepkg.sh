#! /bin/bash
# Based on info from: https://chrislea.com/2018/08/20/cross-compiling-node-js-for-arm-on-ubuntu/

export CC="/synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/bin/aarch64-unknown-linux-gnueabi-gcc"
export CXX="/synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/bin/aarch64-unknown-linux-gnueabi-g++"
export LINK="/synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/bin/aarch64-unknown-linux-gnueabi-g++"
export SOLINK="/synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/bin/aarch64-unknown-linux-gnueabi-g++"
export SOLINK_MODULE="/synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/bin/aarch64-unknown-linux-gnueabi-g++"
export AS="/synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/bin/aarch64-unknown-linux-gnueabi-as"
export AR="/synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/bin/aarch64-unknown-linux-gnueabi-ar"

export CC_host="gcc"
export CXX_host="g++" 
export LINK_host="g++" 
export SOLINK_host="g++" 
export SOLINK_MODULE_host="g++" 

cp /synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/aarch64-unknown-linux-gnueabi/sysroot/usr/lib/* /synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/aarch64-unknown-linux-gnueabi/sysroot/usr/lib64/ -r

cd /
git clone https://github.com/nodejs/node.git
cd /node
git checkout v8.11.3
wget https://raw.githubusercontent.com/zeit/pkg-fetch/master/patches/node.v8.11.3.cpp.patch
git apply node.v8.11.3.cpp.patch
/bin/bash ./configure --prefix=../install --dest-cpu=arm64 --cross-compiling --dest-os=linux --with-arm-float-abi=hard --with-arm-fpu=neon
# make -j6 parameter caused freezes of the build process (JH)
make
cp out/Release/node /nodepkg/node-arm64-rtd1296-synology