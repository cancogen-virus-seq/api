/*
 * Copyright (c) 2021 The Ontario Institute for Cancer Research. All rights reserved
 *
 * This program and the accompanying materials are made available under the terms of
 * the GNU Affero General Public License v3.0. You should have received a copy of the
 * GNU Affero General Public License along with this program.
 *  If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 * SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import urlJoin from 'url-join';

// import logger from '../logger';
// import * as vault from './vault';

const JWKS_URI_PATH = '/oauth/jwks';

export interface AppSecrets {
	auth: {
		clientSecret: string;
	};
}

export interface AppConfig {
	auth: {
		apiRootUrl: string;
		jwksUri: string;
		clientId: string;
		sessionDuration: number;
		sessionTokenKey: string;
	};
	client: {
		domain: string;
	};
	db: {
		api: {
			debug: boolean;
			host: string;
			idleTimeoutMS: number;
			maxPoolSize: number;
			name: string;
			pass: string;
			port: number;
			user: string;
		};
		singularity: {
			debug: boolean;
			host: string;
			idleTimeoutMS: number;
			maxPoolSize: number;
			name: string;
			pass: string;
			port: number;
			user: string;
		};
		song: {
			debug: boolean;
			host: string;
			idleTimeoutMS: number;
			maxPoolSize: number;
			name: string;
			pass: string;
			port: number;
			user: string;
		};
	};
	drs: {
		objectPath: string;
		protocol: string;
	};
	flag: {
		storageRootAdmin: boolean;
	};
	es: {
		user: string;
		password: string;
		host: string;
	};
	download: {
		sequences_limit: number;
	};
	covizu: {
		dataUrl: string;
		fileListUrl: string;
		slackUrl: string;
		version: string;
	};
	debug: boolean;
	podName: string;
	port: number;
}

let appSecrets: AppSecrets | undefined = undefined;

const vaultEnabled = (process.env.VAULT_ENABLED || '').toLowerCase() === 'true';

const loadVaultSecrets = async () => {
	// logger.info('Loading Vault secrets...');
	try {
		if (process.env.VAULT_SECRETS_PATH) {
			// return await vault.loadSecret(process.env.VAULT_SECRETS_PATH);
		}
		throw new Error('Path to secrets not specified but vault is enabled');
	} catch (error) {
		// logger.error(error);
		throw new Error('Failed to load secrets from vault.');
	}
};

const buildAppSecrets = async (secrets: Record<string, any> = {}): Promise<AppSecrets> => {
	// logger.info('Building app secrets...');

	appSecrets = {
		auth: {
			clientSecret: secrets.AUTH_CLIENT_SECRET || process.env.AUTH_CLIENT_SECRET || '',
		},
	};
	return appSecrets;
};

export const getAppSecrets = async () => {
	if (appSecrets !== undefined) {
		return appSecrets;
	}
	if (vaultEnabled) {
		const secrets = await loadVaultSecrets();
		return buildAppSecrets(secrets);
	}
	return buildAppSecrets();
};

const getAppConfig = (): AppConfig => {
	return {
		auth: {
			apiRootUrl: process.env.AUTH_API_ROOT || '',
			jwksUri: process.env.AUTH_API_ROOT ? urlJoin(process.env.AUTH_API_ROOT, JWKS_URI_PATH) : '',
			clientId: process.env.AUTH_CLIENT_ID || '',
			sessionDuration: Number(process.env.AUTH_SESSION_DURATION) || 1800000,
			sessionTokenKey: process.env.AUTH_SESSION_TOKEN_KEY || '',
		},
		client: {
			domain: process.env.DOMAIN_ROOT_URL || 'http://localhost:3000',
		},
		db: {
			api: {
				debug: process.env.API_POSTGRES_DEBUG === 'true',
				host: process.env.API_POSTGRES_HOST || 'localhost',
				idleTimeoutMS: Number(process.env.API_POSTGRES_IDLETIMEOUTMS) || 1000,
				maxPoolSize: Number(process.env.API_POSTGRES_MAXPOOLSIZE) || 20,
				name: process.env.API_POSTGRES_DB || 'virusseq_api',
				pass: process.env.API_POSTGRES_PASSWORD || '',
				port: Number(process.env.API_POSTGRES_PORT) || 5432,
				user: process.env.API_POSTGRES_USERNAME || '',
			},
			singularity: {
				debug: process.env.SINGULARITY_POSTGRES_DEBUG === 'true',
				host: process.env.SINGULARITY_POSTGRES_HOST || 'localhost',
				idleTimeoutMS: Number(process.env.SINGULARITY_POSTGRES_IDLETIMEOUTMS) || 1000,
				maxPoolSize: Number(process.env.SINGULARITY_POSTGRES_MAXPOOLSIZE) || 20,
				name: process.env.SINGULARITY_POSTGRES_DB || 'singularity',
				pass: process.env.SINGULARITY_POSTGRES_PASSWORD || '',
				port: Number(process.env.SINGULARITY_POSTGRES_PORT) || 5432,
				user: process.env.SINGULARITY_POSTGRES_USERNAME || '',
			},
			song: {
				debug: process.env.SONG_POSTGRES_DEBUG === 'true',
				host: process.env.SONG_POSTGRES_HOST || 'localhost',
				idleTimeoutMS: Number(process.env.SONG_POSTGRES_IDLETIMEOUTMS) || 1000,
				maxPoolSize: Number(process.env.SONG_POSTGRES_MAXPOOLSIZE) || 20,
				name: process.env.SONG_POSTGRES_DB || 'song',
				pass: process.env.SONG_POSTGRES_PASSWORD || '',
				port: Number(process.env.SONG_POSTGRES_PORT) || 5432,
				user: process.env.SONG_POSTGRES_USERNAME || '',
			},
		},
		drs: {
			objectPath: process.env.DRS_OBJECT_PATH || 'ga4gh/drs/v1/objects',
			protocol: process.env.DRS_PROTOCOL || 'https',
		},
		flag: {
			storageRootAdmin:
				(process.env.FLAG__STORAGE_ROOT_ADMIN || '').toLowerCase() === 'true' || false,
		},
		es: {
			user: process.env.ES_USER || '',
			password: process.env.ES_PASS || '',
			host: process.env.ES_HOST || '',
		},
		download: {
			sequences_limit: Number(process.env.SEQ_FILE_DOWNLOAD_LIMIT) || 10,
		},
		covizu: {
			dataUrl: process.env.COVIZU_DATA_URL || '',
			fileListUrl: process.env.COVIZU_FILE_LIST_URL || '',
			slackUrl: process.env.COVIZU_SLACK_WEBHOOK_URL || '',
			version: process.env.COVIZU_VERSION || '',
		},
		debug: process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true',
		podName: process.env.HOSTNAME || '',
		port: Number(process.env.PORT) || 4000,
	};
};

export default getAppConfig;
