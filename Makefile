test:
	@./node_modules/.bin/mocha --recursive

.PHONY: test

clean:
	rm -rf node_modules