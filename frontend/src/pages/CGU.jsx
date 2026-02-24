import React from 'react';
import { ArrowLeft, Shield, FileText, Users, AlertTriangle, Lock, Globe } from 'lucide-react';

const Section = ({ icon: Icon, title, children }) => (
    <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>
        <div className="pl-13 text-gray-600 leading-relaxed space-y-3 ml-13" style={{marginLeft: '52px'}}>
            {children}
        </div>
    </div>
);

const CGU = () => {
    const goBack = () => window.history.back();

    return (
        <div className="min-h-screen bg-gray-50 pt-20">
            <div className="max-w-3xl mx-auto px-4 py-10">

                <button
                    onClick={goBack}
                    className="mb-8 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium"
                >
                    <ArrowLeft size={18} />
                    Retour
                </button>

                <div className="bg-gray-900 rounded-2xl p-8 mb-10 text-white">
                    <div className="flex items-center gap-3 mb-3">
                        <FileText size={28} className="text-white opacity-80" />
                        <span className="text-sm font-semibold uppercase tracking-widest opacity-60">Documents légaux</span>
                    </div>
                    <h1 className="text-4xl font-bold mb-2">Conditions Générales</h1>
                    <p className="text-gray-400 text-lg">d'Utilisation · Politique de Confidentialité · Règles de la communauté</p>
                    <p className="text-gray-500 text-sm mt-4">Dernière mise à jour : 23 février 2026 · LaughTube Inc.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-10 text-sm text-gray-600">
                        En utilisant LaughTube, vous acceptez l'ensemble des présentes conditions. Veuillez les lire attentivement avant de créer votre compte.
                    </div>

                    <h2 className="text-2xl font-black text-gray-900 mb-8 pb-4 border-b border-gray-200 uppercase tracking-tight">
                        I. Conditions Générales d'Utilisation
                    </h2>

                    <Section icon={Globe} title="1. Acceptation des conditions">
                        <p>En accédant à LaughTube et en créant un compte, vous déclarez avoir lu, compris et accepté les présentes Conditions Générales d'Utilisation. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser notre plateforme.</p>
                        <p>Ces conditions s'appliquent à tous les utilisateurs de LaughTube, qu'ils soient visiteurs, membres inscrits ou créateurs de contenu.</p>
                    </Section>

                    <Section icon={Users} title="2. Inscription et compte utilisateur">
                        <p>Pour accéder aux fonctionnalités complètes de LaughTube, vous devez créer un compte en fournissant des informations exactes et à jour.</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Vous devez avoir au moins 13 ans pour créer un compte</li>
                            <li>Vous êtes responsable de la confidentialité de vos identifiants</li>
                            <li>Vous devez nous notifier immédiatement de toute utilisation non autorisée</li>
                            <li>Un seul compte par personne est autorisé</li>
                        </ul>
                    </Section>

                    <Section icon={FileText} title="3. Contenu publié">
                        <p>En publiant du contenu sur LaughTube, vous nous accordez une licence mondiale, non exclusive et libre de redevance pour afficher, reproduire et distribuer ce contenu sur notre plateforme.</p>
                        <p>Vous conservez tous vos droits de propriété intellectuelle sur votre contenu. Vous êtes seul responsable du contenu que vous publiez.</p>
                    </Section>

                    <Section icon={AlertTriangle} title="4. Contenu interdit">
                        <p>Il est strictement interdit de publier :</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Du contenu illégal, diffamatoire ou portant atteinte à la vie privée</li>
                            <li>Du contenu à caractère pornographique ou sexuellement explicite</li>
                            <li>Des propos haineux, racistes ou discriminatoires</li>
                            <li>Du contenu incitant à la violence ou au harcèlement</li>
                            <li>Du spam ou de la publicité non autorisée</li>
                            <li>Du contenu violant les droits d'auteur d'un tiers</li>
                        </ul>
                    </Section>

                    <Section icon={Shield} title="5. Suspension et résiliation">
                        <p>LaughTube se réserve le droit de suspendre ou de résilier votre compte à tout moment en cas de violation des présentes conditions, sans préavis ni remboursement.</p>
                        <p>Vous pouvez supprimer votre compte à tout moment depuis vos paramètres. La suppression entraîne l'effacement définitif de vos données dans un délai de 30 jours.</p>
                    </Section>

                    <h2 className="text-2xl font-black text-gray-900 mb-8 pb-4 border-b border-gray-200 uppercase tracking-tight mt-12">
                        II. Politique de Confidentialité
                    </h2>

                    <Section icon={Lock} title="6. Données collectées">
                        <p>Nous collectons les données suivantes :</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Données d'inscription :</strong> nom d'utilisateur, adresse email, mot de passe (chiffré)</li>
                            <li><strong>Données de profil :</strong> avatar, photo de couverture, biographie</li>
                            <li><strong>Données d'usage :</strong> vidéos regardées, commentaires, abonnements</li>
                            <li><strong>Données techniques :</strong> adresse IP, type de navigateur, logs de connexion</li>
                        </ul>
                    </Section>

                    <Section icon={Shield} title="7. Utilisation des données">
                        <p>Vos données sont utilisées exclusivement pour :</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Fournir et améliorer nos services</li>
                            <li>Sécuriser votre compte (authentification, détection de fraude)</li>
                            <li>Vous envoyer des notifications liées à votre compte</li>
                            <li>Respecter nos obligations légales</li>
                        </ul>
                        <p className="mt-2 font-medium text-gray-800">Nous ne vendons jamais vos données à des tiers.</p>
                    </Section>

                    <Section icon={Lock} title="8. Sécurité des données">
                        <p>LaughTube met en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données, incluant le chiffrement des mots de passe, l'authentification à deux facteurs et la surveillance des accès.</p>
                    </Section>

                    <Section icon={Globe} title="9. Vos droits">
                        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Droit d'accès à vos données personnelles</li>
                            <li>Droit de rectification des données inexactes</li>
                            <li>Droit à l'effacement (droit à l'oubli)</li>
                            <li>Droit à la portabilité de vos données</li>
                            <li>Droit d'opposition au traitement</li>
                        </ul>
                        <p>Pour exercer ces droits, contactez-nous à <strong>privacy@laughtube.ca</strong></p>
                    </Section>

                    <h2 className="text-2xl font-black text-gray-900 mb-8 pb-4 border-b border-gray-200 uppercase tracking-tight mt-12">
                        III. Règles de la Communauté
                    </h2>

                    <Section icon={Users} title="10. Respect et bienveillance">
                        <p>LaughTube est une communauté basée sur l'humour et le respect mutuel. Tout utilisateur s'engage à :</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Traiter les autres membres avec respect</li>
                            <li>Ne pas harceler, intimider ou menacer d'autres utilisateurs</li>
                            <li>Ne pas usurper l'identité d'une autre personne</li>
                            <li>Signaler les contenus inappropriés via le système de signalement</li>
                        </ul>
                    </Section>

                    <Section icon={FileText} title="11. Qualité du contenu">
                        <p>Pour maintenir la qualité de notre plateforme :</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Publiez uniquement du contenu original ou pour lequel vous détenez les droits</li>
                            <li>Évitez le contenu trompeur ou les fausses informations</li>
                            <li>N'utilisez pas de bots ou de moyens artificiels pour gonfler vos statistiques</li>
                            <li>Respectez les formats et limites de taille des fichiers</li>
                        </ul>
                    </Section>

                    <Section icon={AlertTriangle} title="12. Sanctions">
                        <p>En cas de violation des règles de la communauté, LaughTube peut appliquer les sanctions suivantes selon la gravité de l'infraction :</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Avertissement</li>
                            <li>Suppression du contenu concerné</li>
                            <li>Suspension temporaire du compte</li>
                            <li>Bannissement définitif</li>
                        </ul>
                    </Section>

                    <div className="mt-12 pt-8 border-t border-gray-200 text-sm text-gray-400 space-y-2">
                        <p>Ces conditions sont régies par le droit canadien et québécois.</p>
                        <p>Pour toute question : <strong className="text-gray-600">legal@laughtube.ca</strong></p>
                        <p>© 2026 LaughTube. Tous droits réservés.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CGU;