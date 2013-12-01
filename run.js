var migrator = require('./ubbmigrator.js'),
	config = require('./run.config.json');

migrator.common.migrate(config);
