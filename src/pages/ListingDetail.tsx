
import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { ListingGallery } from '@/components/listing-detail/ListingGallery';
import { ListingHeader } from '@/components/listing-detail/ListingHeader';
import { ListingPrice } from '@/components/listing-detail/ListingPrice';
import { ListingDescription } from '@/components/listing-detail/ListingDescription';
import { ListingStats } from '@/components/listing-detail/ListingStats';
import { SellerInfo } from '@/components/listing-detail/SellerInfo';
import { SafetyTips } from '@/components/listing-detail/SafetyTips';
import { SimilarListings } from '@/components/listing-detail/SimilarListings';
import LocationMap from '@/components/listing-detail/LocationMap';
import { mockListings } from '@/data/mockListings';
import { Listing } from '@/types/listingType';
import { useAppWithTranslations } from '@/stores/useAppStore';
import { getCategoryConfig } from '@/categories/categoryRegistry';
import { parseListingUrl, findListingBySlug } from '@/utils/urlUtils';
import { useListings } from '@/hooks/useListings';

export default function ListingDetail() {
  const { id: listingId, categorySlug, titleSlug } = useParams<{ 
    id?: string; 
    categorySlug?: string; 
    titleSlug?: string; 
  }>();
  const { language } = useAppWithTranslations();
  const location = useLocation();
  const [listing, setListing] = useState<Listing | null>(null);
  const [breadcrumbItems, setBreadcrumbItems] = useState<{label: string, link?: string}[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPhoneVisible, setIsPhoneVisible] = useState(false);
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);
  const { getListingById } = useListings();

  useEffect(() => {
    const loadListing = async () => {
      let targetListing = null;
      
      // Если есть SEO URL (category + title slug)
      if (categorySlug && titleSlug) {
        console.log('🔍 Поиск по SEO URL:', { categorySlug, titleSlug });
        
        // Ищем в мок данных по slug
        targetListing = findListingBySlug(mockListings, categorySlug, titleSlug);
        
        if (targetListing) {
          console.log('✅ Найдено объявление по slug:', targetListing);
        }
      } 
      // Если есть старый формат URL с ID
      else if (listingId) {
        console.log('🔍 Поиск по ID:', listingId);
        
        // Пробуем найти в Supabase
        const supabaseListing = await getListingById(listingId);
        if (supabaseListing) {
          targetListing = supabaseListing;
        } else {
          // Fallback к мок данным
          targetListing = mockListings.find(item => item.id === listingId);
        }
      }

      if (!targetListing) {
        console.error('❌ Объявление не найдено');
        return;
      }

      console.log('✅ Загружено объявление:', targetListing);
      setListing(targetListing);
      
      // Найти похожие объявления
      const similar = mockListings
        .filter(item => item.categoryId === targetListing.categoryId && item.id !== targetListing.id)
        .slice(0, 4);
      setSimilarListings(similar);
      
      // Построить breadcrumbs
      const categoryItems = [];
      
      categoryItems.push({
        label: language === 'ru' ? 'Главная' : 'Басты бет',
        link: '/'
      });
      
      if (targetListing.categoryId) {
        const categoryConfig = getCategoryConfig(targetListing.categoryId);
        if (categoryConfig) {
          categoryItems.push({
            label: categoryConfig.name[language] || targetListing.categoryId,
            link: `/category/${targetListing.categoryId}`
          });
        }
      }
      
      setBreadcrumbItems(categoryItems);
    };

    loadListing();
  }, [listingId, categorySlug, titleSlug, language, location.pathname, getListingById]);

  // Utility functions for formatting
  const formatPrice = (price: number) => {
    if (price === 0) return language === 'ru' ? 'Бесплатно' : 'Тегін';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' ₸';
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'kk-KZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };
  
  // Event handlers
  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: listing?.title[language] || '',
        url: window.location.href
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    }
  };
  
  const handleShowPhone = () => {
    setIsPhoneVisible(true);
  };

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">
            {language === 'ru' ? 'Объявление не найдено' : 'Хабарландыру табылмады'}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Extract and ensure title and description are strings
  const title = typeof listing.title === 'string' 
    ? listing.title 
    : (listing.title && typeof listing.title === 'object' && listing.title[language]) 
      ? listing.title[language] 
      : '';
      
  const city = typeof listing.city === 'string' 
    ? listing.city 
    : (listing.city && typeof listing.city === 'object' && listing.city[language]) 
      ? listing.city[language] 
      : '';
      
  const descriptionText = listing.description ? 
    (typeof listing.description === 'string' ? listing.description : 
     (typeof listing.description === 'object' ? listing.description[language] || '' : '')) 
    : '';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <BreadcrumbNavigation 
        items={breadcrumbItems} 
        currentPage={title} 
      />
      <main className="flex-1 py-6">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Mobile layout */}
          <div className="lg:hidden space-y-4">
            <ListingGallery 
              images={listing.images || [listing.imageUrl]} 
              title={title}
              language={language}
            />
            <ListingHeader 
              title={title}
              city={city}
              createdAt={listing.createdAt}
              views={listing.views}
              id={listing.id}
              price={listing.discountPrice}
              originalPrice={listing.originalPrice}
              discount={listing.discount}
              isFeatured={listing.isFeatured || false}
              isFavorite={isFavorite}
              language={language}
              formatPrice={formatPrice}
              formatDate={formatDate}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleShare}
              isMobile={true}
            />
            <ListingPrice 
              price={listing.discountPrice}
              originalPrice={listing.originalPrice}
              discount={listing.discount}
              formatPrice={formatPrice}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleShare}
            />
            <SellerInfo 
              name={listing.seller.name}
              phone={listing.seller.phone}
              rating={listing.seller.rating}
              deals={listing.seller.reviews || 0}
              memberSince="2022"
              response={language === 'ru' ? 'Отвечает обычно в течении часа' : 'Әдетте бір сағат ішінде жауап береді'}
              lastOnline={language === 'ru' ? 'Был онлайн сегодня' : 'Бүгін онлайн болды'}
              isPhoneVisible={isPhoneVisible}
              language={language}
              onShowPhone={handleShowPhone}
              isMobile={true}
            />
            <ListingDescription 
              description={descriptionText} 
              language={language}
            />
            <ListingStats 
              createdAt={listing.createdAt}
              id={listing.id}
              views={listing.views}
              isFavorite={isFavorite}
              language={language}
              formatDate={formatDate}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleShare}
              isMobile={true}
            />
            <LocationMap 
              city={city} 
              coordinates={listing.coordinates}
              language={language}
            />
            <SafetyTips language={language} />
          </div>

          {/* Desktop layout */}
          <div className="hidden lg:grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <ListingGallery 
                images={listing.images || [listing.imageUrl]} 
                title={title}
                language={language}
              />
              <ListingHeader 
                title={title}
                city={city}
                createdAt={listing.createdAt}
                views={listing.views}
                id={listing.id}
                price={listing.discountPrice}
                originalPrice={listing.originalPrice}
                discount={listing.discount}
                isFeatured={listing.isFeatured || false}
                isFavorite={isFavorite}
                language={language}
                formatPrice={formatPrice}
                formatDate={formatDate}
                onToggleFavorite={handleToggleFavorite}
                onShare={handleShare}
              />
              <ListingDescription 
                description={descriptionText} 
                language={language}
              />
            </div>
            <div className="space-y-6">
              <SellerInfo 
                name={listing.seller.name}
                phone={listing.seller.phone}
                rating={listing.seller.rating}
                deals={listing.seller.reviews || 0}
                memberSince="2022"
                response={language === 'ru' ? 'Отвечает обычно в течении часа' : 'Әдетте бір сағат ішінде жауап береді'}
                lastOnline={language === 'ru' ? 'Был онлайн сегодня' : 'Бүгін онлайн болды'}
                isPhoneVisible={isPhoneVisible}
                language={language}
                onShowPhone={handleShowPhone}
              />
              <SafetyTips language={language} />
              <LocationMap 
                city={city} 
                coordinates={listing.coordinates}
                language={language}
              />
              <ListingStats 
                createdAt={listing.createdAt}
                id={listing.id}
                views={listing.views}
                isFavorite={isFavorite}
                language={language}
                formatDate={formatDate}
                onToggleFavorite={handleToggleFavorite}
                onShare={handleShare}
              />
            </div>
          </div>
          
          <div className="mt-8">
            <SimilarListings 
              listings={similarListings}
              language={language}
              formatPrice={formatPrice}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
