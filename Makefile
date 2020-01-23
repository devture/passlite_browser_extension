help: ## Show this help.
	@fgrep -h "##" $(MAKEFILE_LIST) | fgrep -v fgrep | sed -e 's/\\$$//' | sed -e 's/##//'

source-code-bundle: ## Makes a source code bundle for submitting to appstores for review
	tar \
	--exclude .git \
	--exclude dist \
	--exclude build \
	--exclude node_modules \
	-czPf \
	dist/passbolt-extension-source.tgz .
