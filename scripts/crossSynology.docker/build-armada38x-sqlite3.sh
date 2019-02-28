# Builds node_sqlite3 for Synology ARMv7 models
curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh -o install_nvm.sh
bash install_nvm.sh
. ~/.nvm/nvm.sh   # to make nvm usable from shell
nvm install 8.15.0
nvm use 8.15.0

export CC="/synotoolkit/build_env/ds.armada38x-6.2/usr/local/arm-unknown-linux-gnueabi/bin/arm-unknown-linux-gnueabi-gcc"
export CXX="/synotoolkit/build_env/ds.armada38x-6.2/usr/local/arm-unknown-linux-gnueabi/bin/arm-unknown-linux-gnueabi-g++"
export LINK="/synotoolkit/build_env/ds.armada38x-6.2/usr/local/arm-unknown-linux-gnueabi/bin/arm-unknown-linux-gnueabi-g++"
export SOLINK="/synotoolkit/build_env/ds.armada38x-6.2/usr/local/arm-unknown-linux-gnueabi/bin/arm-unknown-linux-gnueabi-g++"
export SOLINK_MODULE="/synotoolkit/build_env/ds.armada38x-6.2/usr/local/arm-unknown-linux-gnueabi/bin/arm-unknown-linux-gnueabi-g++"
export AS="/synotoolkit/build_env/ds.armada38x-6.2/usr/local/arm-unknown-linux-gnueabi/bin/arm-unknown-linux-gnueabi-as"
export AR="/synotoolkit/build_env/ds.armada38x-6.2/usr/local/arm-unknown-linux-gnueabi/bin/arm-unknown-linux-gnueabi-ar"

cd /
mkdir sqlite
cd sqlite
npm install sqlite3 --build-from-source --target_arch=arm
cp -r /sqlite/node_modules/sqlite3/lib/binding /local