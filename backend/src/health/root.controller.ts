import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

/**
 * The API's own address, opened in a browser.
 *
 * `/api` is where the routes live, not a page, and it answered "404: Cannot GET
 * /api" to anybody who tried it — which is what the terminal invites you to do,
 * because the last thing printed when the servers start is the API's address.
 * A 404 there reads as "the backend is broken" when nothing is wrong at all.
 *
 * It sends the reader to the documentation instead, which is what they were
 * almost certainly looking for.
 */
@ApiExcludeController()
@Controller()
export class RootController {
  @Public()
  @Get()
  @Redirect('/api/docs', 302)
  documentation() {
    return undefined;
  }
}
