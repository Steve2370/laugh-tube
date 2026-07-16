<?php
namespace App\Helpers;

use GeoIp2\Database\Reader;

class GeoIPHelper
{
    public static function getCountry(string|null $ip): string
    {
        if (!$ip || in_array($ip, ['127.0.0.1', '::1'])) {
            return 'Local';
        }

        try {
            $dbPath = storage_path('geoip/GeoLite2-Country.mmdb');
            $reader = new Reader($dbPath);
            $record = $reader->country($ip);
            return $record->country->name ?? 'Inconnu';
        } catch (\Exception $e) {
            return 'Inconnu';
        }
    }

    public static function getCountryCode(string|null $ip): string
    {
        if (!$ip || in_array($ip, ['127.0.0.1', '::1'])) {
            return 'LOCAL';
        }

        try {
            $dbPath = storage_path('geoip/GeoLite2-Country.mmdb');
            $reader = new Reader($dbPath);
            $record = $reader->country($ip);
            return $record->country->isoCode ?? 'XX';
        } catch (\Exception $e) {
            return 'XX';
        }
    }
}
