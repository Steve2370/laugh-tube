<?php

namespace App\Providers;

use App\Repositories\LogRepository;
use App\Services\EmailService;
use App\Services\ResendEmailProvider;
use Illuminate\Support\ServiceProvider;
use SocialiteProviders\Apple\AppleExtendSocialite;
use SocialiteProviders\Apple\Provider;
use SocialiteProviders\Manager\SocialiteWasCalled;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(EmailService::class, function ($app) {
            $provider = new ResendEmailProvider([
                'resend_api_key' => env('RESEND_API_KEY'),
                'from_email' => env('MAIL_FROM_ADDRESS', 'noreply@laughtube.ca'),
            ]);

            return new EmailService(
                new LogRepository(),
                $provider,
                env('APP_URL', 'https://www.laughtube.ca')
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Event::listen(function (SocialiteWasCalled $event) {
            $event->extendSocialite('apple', Provider::class);
        });
    }
}
