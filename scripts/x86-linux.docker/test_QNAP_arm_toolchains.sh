#! /bin/bash
# JH: Not working yet, as the toolchain is old and doesn't compile node.js sucessfully

#apt-get install libc6-i386
#apt-get install lib32stdc++6

#export LD_LIBRARY_PATH="/opt/cross-project/arm/linaro/arm-linux-gnueabihf/lib/"


export COMPILER_PATH="/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/libexec/gcc/arm-openwrt-linux-gnueabi/4.5.4/"
export GCC_EXEC_PREFIX="/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/libexec/gcc/arm-openwrt-linux-gnueabi/4.5.4/"

export CC="/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/arm-openwrt-linux-gnueabi/bin/gcc -I/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/include/linux/ -I/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/include -I/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/lib/gcc/arm-openwrt-linux-gnueabi/4.5.4/include/ -I/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/arm-openwrt-linux-gnueabi/include/c++/4.5.4/"
export CXX="/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/arm-openwrt-linux-gnueabi/bin/g++ -I/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/include/linux/ -I/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/include -I/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/lib/gcc/arm-openwrt-linux-gnueabi/4.5.4/include/ -I/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/arm-openwrt-linux-gnueabi/include/c++/4.5.4/ -I/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/arm-openwrt-linux-gnueabi/include/c++/4.5.4/arm-openwrt-linux-gnueabi/"

export CC="/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/arm-openwrt-linux-gnueabi/bin/gcc -I/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/include/linux/ -I/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/include"
export CXX="/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/arm-openwrt-linux-gnueabi/bin/g++ -I/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/include/linux/ -I/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/include"
export LINK="/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/arm-openwrt-linux-gnueabi/bin/g++"
export SOLINK="/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/arm-openwrt-linux-gnueabi/bin/g++"
export SOLINK_MODULE="/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/arm-openwrt-linux-gnueabi/bin/g++"
export AS="/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/arm-openwrt-linux-gnueabi/bin/as"
export AR="/opt/cross-project/arm/mindspeed/toolchain-arm_v7-a_gcc-4.5-linaro_glibc-2.14.1_eabi/arm-openwrt-linux-gnueabi/bin/ar"

export CC="/opt/cross-project/arm/marvell/arm-none-linux-gnueabi/bin/gcc"
export CXX="/opt/cross-project/arm/marvell/arm-none-linux-gnueabi/bin/g++"
export LINK="/opt/cross-project/arm/marvell/arm-none-linux-gnueabi/bin/g++"
export SOLINK="/opt/cross-project/arm/marvell/arm-none-linux-gnueabi/bin/g++"
export SOLINK_MODULE="/opt/cross-project/arm/marvell/arm-none-linux-gnueabi/bin/g++"
export AS="/opt/cross-project/arm/marvell/arm-none-linux-gnueabi/bin/as"
export AR="/opt/cross-project/arm/marvell/arm-none-linux-gnueabi/bin/ar"



# export CC_host="gcc -m32"
# export CXX_host="g++ -m32" 
# export LINK_host="g++ -m32" 
# export SOLINK_host="g++ -m32" 
# export SOLINK_MODULE_host="g++ -m32"

#export CXXFLAGS="-isystem /synotoolkit/build_env/ds.alpine4k-6.2/usr/local/arm-linux-gnueabihf/arm-linux-gnueabihf/libc/usr/include/arm-linux-gnueabi -L/synotoolkit/build_env/ds.alpine4k-6.2/usr/local/arm-linux-gnueabihf/arm-linux-gnueabihf/libc/usr/lib/arm-linux-gnueabihf"

# /synotoolkit/build_env/ds.alpine4k-6.2/usr/local/arm-linux-gnueabihf/arm-linux-gnueabihf/libc/usr/include/arm-linux-gnueabi

cd /
git clone https://github.com/nodejs/node.git
cd /node
git checkout v8.11.3
wget https://raw.githubusercontent.com/zeit/pkg-fetch/master/patches/node.v8.11.3.cpp.patch
git apply node.v8.11.3.cpp.patch
/bin/bash ./configure --prefix=../install --dest-cpu=arm --cross-compiling --dest-os=linux --with-arm-float-abi=hard --with-arm-fpu=neon
make
cp out/Release/node /nodepkg/node-arm64-rtd1296-synology