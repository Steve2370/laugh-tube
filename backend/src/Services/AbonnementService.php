<?php

namespace App\Services;

use App\Models\Abonnement;
use App\Models\User;

class AbonnementService
{
    public function __construct(
        private Abonnement $abonnementModel,
        private User $userModel,
        private ?NotificationCreationService $notificationService = null
    ) {}

    public function subscribe(int $subscriberId, int $targetUserId): array
    {
        if ($subscriberId === $targetUserId) {
            throw new \InvalidArgumentException("Impossible de s'abonner à soi-même");
        }

        $targetUser = $this->userModel->findById($targetUserId);
        if (!$targetUser) {
            throw new \RuntimeException("Utilisateur cible non trouvé");
        }
        $this->abonnementModel->abonneToi($subscriberId, $targetUserId);

        if ($this->notificationService) {
            try {
                $this->notificationService->createSubscriptionNotification(
                    $targetUserId,
                    $subscriberId
                );
            } catch (\Exception $e) {
                error_log("AbonnementService::subscribe - Notification error: " . $e->getMessage());
            }
        }

        return [
            'success' => true,
            'subscribers_count' => $this->abonnementModel->conterAbonnes($targetUserId)
        ];
    }

    public function unsubscribe(int $subscriberId, int $targetUserId): array
    {
        $this->abonnementModel->desabonneToi($subscriberId, $targetUserId);

        return [
            'success' => true,
            'subscribers_count' => $this->abonnementModel->conterAbonnes($targetUserId)
        ];
    }

    public function getStatus(int $subscriberId, int $targetUserId): array
    {
        return [
            'is_subscribed' => $this->abonnementModel->isAbonne($subscriberId, $targetUserId),
            'subscribers_count' => $this->abonnementModel->conterAbonnes($targetUserId),
            'isAbonne' => $this->abonnementModel->isAbonne($subscriberId, $targetUserId),
            'nbAbonnes' => $this->abonnementModel->conterAbonnes($targetUserId)
        ];
    }

    public function getSubscribersCount(int $targetUserId): int
    {
        return $this->abonnementModel->conterAbonnes($targetUserId);
    }

    public function getSubscribers(int $userId): array
    {
        $subscribers = $this->abonnementModel->listeAbonnesAvecAbonnement($userId);

        return [
            'success' => true,
            'subscribers' => $subscribers,
            'count' => count($subscribers)
        ];
    }

    public function getSubscriptions(int $userId): array
    {
        $subscriptions = $this->abonnementModel->listeAbonnementsAvecAbonnes($userId);

        return [
            'success' => true,
            'subscriptions' => $subscriptions,
            'count' => count($subscriptions)
        ];
    }
}