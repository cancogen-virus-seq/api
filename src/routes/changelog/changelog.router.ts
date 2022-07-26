/*
 * Copyright (c) 2022 The Ontario Institute for Cancer Research. All rights reserved
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

import { NextFunction, Request, Response, Router } from 'express';
import { URL } from 'url';

import getAppConfig from '@/config/global';
import logger from '@/logger';
import { getReleaseCounts } from './changelog.service';
import { PaginationParamsInterface } from './types';

const router: Router = Router();

// TODO: Cancellable requests.
router.get('/:releaseId?', async (req: Request, res: Response) => {
	try {
		const {
			createdAfter,
			createdBefore,
			page = 0,
			size = 0,
			sortDirection,
			sortFieldName,
		} = req.query as PaginationParamsInterface;
		const pageAsNum = Number(page);
		const sizeAsNum = Number(size);

		const limit = sizeAsNum;
		const offset = pageAsNum * (limit ? sizeAsNum : 1);

		const { countsByRelease, totalReleases } = await getReleaseCounts(
			{
				createdAfter,
				createdBefore,
				offset,
				limit,
				sortDirection,
				sortFieldName,
			},
			req.params.releaseId,
		);

		const responseData = {
			releases: countsByRelease,
			sortDirection,
			sortFieldName,
			totalReleases,
			...(sizeAsNum && {
				page: pageAsNum,
				size: sizeAsNum,
				totalPages: Math.ceil(totalReleases / sizeAsNum),
			}),
		};

		return res.status(200).send(responseData);
	} catch (error) {
		if (error instanceof Error) {
			logger.debug(`Could not retrieve changes: ${error.message}`);
		}
		// TODO: change error
		return res.status(500).send('Failure retrieving release changelogs');
	}
});

export default router;
