FROM ubuntu

# ==== Basic setup ====
RUN apt-get -qq update
RUN apt-get -qq -y install curl build-essential checkinstall python git python3 xz-utils bsdtar wget

# ==== Synology setup =====
RUN mkdir -p /synotoolkit
WORKDIR "/synotoolkit"
RUN git clone https://github.com/SynologyOpenSource/pkgscripts-ng pkgscripts
WORKDIR "/synotoolkit/pkgscripts"

# Workaround for tar problems with Docker (use bsdtar instead)
RUN sed -i "s/'tar'/'bsdtar'/g" EnvDeploy               # tar problem in Docker
RUN sed -i "s/'-xhf'/'-xf'/g" EnvDeploy                 # tar problem in Docker
# End of workaround

# For a particular Synology NAS model (armv7 instructions). We'll probably need more builds...
# armada370 has an old gcc, doesn't work well for me
# RUN ./EnvDeploy -v 6.0 -p armada370
# alpine4k is quite recent armv7 platform, seems to be usable e.g. for armada370 as well
# RUN ./EnvDeploy -v 6.2 -p alpine4k
RUN ./EnvDeploy -v 6.2 -p rtd1296