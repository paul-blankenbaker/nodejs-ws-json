PKG=nodejs-ws-json
VER=$(shell echo 'console.log(require("../package.json").version);' | node)
RELEASE=4
SPEC=$(HOME)/rpmbuild/SPECS/$(PKG).spec
SOURCE=$(HOME)/rpmbuild/SOURCES/$(PKG)-$(VER).tgz

rpm::

$(SPEC)::	$(PKG).spec makefile
	install -D $(PKG).spec $(@);
	sed -i -e 's,__VERSION__,$(VER),' -e 's,__RELEASE__,$(RELEASE),' $(@)

$(SOURCE)::
	(cd .. && npm pack && mv $(PKG)-$(VER).tgz $(@))

$(HOME)/rpmbuild/RPMS/noarch/$(PKG)-$(VER)-$(RELEASE).noarch.rpm:: $(SPEC) $(SOURCE)
	rpmbuild -bb $(SPEC);

rpm::	$(HOME)/rpmbuild/RPMS/noarch/$(PKG)-$(VER)-$(RELEASE).noarch.rpm
