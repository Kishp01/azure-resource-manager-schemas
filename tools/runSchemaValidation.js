"use strict";

const assert = require('assert')
const path = require('path')
const fs = require('fs')
const url = require('url')
const SchemaService = require("vscode-json-languageservice");
const Types = require('vscode-languageserver-types');
const forEach = require('mocha-each');

let normalizedSchemaId = function (id) {
	if (id.length && id[id.length - 1] === '#') {
		id = id.substr(0, id.length - 1);
	}

	return id;
}

let requestServiceMock = function (uri) {
  let schemaRootUri = 'https://schema.management.azure.com/schemas';
  uri = normalizedSchemaId(uri);

	if (uri.startsWith(schemaRootUri)) {
		let relativePath = uri.substr(schemaRootUri.length);

		if (relativePath) {
			return new Promise((resolve, reject) => {
				let filePath = path.join(__dirname, '../schemas', relativePath);

				fs.readFile(filePath, 'UTF-8', (err, result) => {
					err ? reject('Resource not found.') : resolve(result.toString());
				});
			});
		}
	}

	return Promise.reject('Resource not found.');
};

let workspaceContext = {
	resolveRelativePath: (relativePath, resource) => {
		return url.resolve(resource, relativePath);
	}
};

let parameters = {
	schemaRequestService: requestServiceMock,
	workspaceContext: workspaceContext
};

let service = SchemaService.getLanguageService(parameters);
let templateFolder = './templateFiles';

let validateTemplateWithSchema = function (file) {
	let filePath = path.join(__dirname, templateFolder, file);
	let content = fs.readFileSync(filePath, 'utf8');

	let textDocument = Types.TextDocument.create(filePath, 'json', 0, content);
	let jsonDocument = service.parseJSONDocument(textDocument);

	return service.doValidation(textDocument, jsonDocument);
};

describe('validate template files with schema - ', () => {
	let files = fs.readdirSync(templateFolder);

	forEach(files).it("running schema validation on '%s'", function (file, done) {
		this.timeout(10000);

		validateTemplateWithSchema(file)
			.then(function (result) {
					assert.deepEqual(result, [], `there are validation errors in template '${file}'.`);
				}
			).then(
        () => done(), 
        (error) => done(error)
      );
	});
});