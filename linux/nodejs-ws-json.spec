%global npm_name nodejs-ws-json
# Although there are tests
# the dependancies aren't in Fedora yet
%global enable_tests 0

%{?nodejs_find_provides_and_requires}

Summary:       Web socket server that exchanges information via JSON messages
Name:          %{npm_name}
Version:       __VERSION__
Release:       __RELEASE__%{?dist}
Group:         System Environment/Libraries
License:       MIT
URL:           https://github.com/paul-blankenbaker/nodejs-ws-json
Source0:       %{npm_name}-%{version}.tgz
Requires:      nodejs-ws
BuildRequires: nodejs-packaging
%if 0%{?enable_tests}
BuildRequires: npm(ansi)
BuildRequires: npm(benchmark)
BuildRequires: npm(expect.js)
BuildRequires: npm(mocha)
BuildRequires: npm(should)
BuildRequires: npm(tinycolor)
%endif
BuildArch:     noarch
ExclusiveArch: %{nodejs_arches} noarch

%description
A Node.js WebSocket server framework built on top of ws-json
(https://github.com/websockets/ws). This framework uses JSON messages
to simplify the process of passing information between the client and
the server. It includes factory default handlers that can be enabled
for executing arbitrary processes and examining files on the server.

%prep
%setup -q -n package

%build
for f in examples/server-example/*.js; do
  sed -i \
      -e 's,\.\./\.\./index,%{npm_name},' \
      -e 's,\.\./\.\.,%{npm_name},' \
      "${f}";
done

%install
mkdir -p %{buildroot}%{nodejs_sitelib}/%{npm_name}
cp -pr index.js lib handlers package.json %{buildroot}%{nodejs_sitelib}/%{npm_name}

%nodejs_symlink_deps

%if 0%{?enable_tests}
%check
make test
%endif

%files
%doc README.md examples
%license LICENSE
%{nodejs_sitelib}/%{npm_name}

%changelog
* Wed Apr 22 2020 Paul Blankenbaker <paul.blankenbaker@gmail.com> - 1.1.0-6
- Added some more convenience methods to the client and server classes.

* Fri Jan 04 2019 Paul Blankenbaker <paul.blankenbaker@gmail.com> - 1.0.0-4
- Initial release
