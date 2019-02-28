docker build -t mms/crosscompiler crossSynology.docker
docker run -it --privileged -v %CD%/crossSynology.docker/:/local mms/crosscompiler bash