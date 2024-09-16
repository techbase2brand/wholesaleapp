import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Image, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Pressable, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp, } from '../utils';
import { whiteColor, blackColor, grayColor, redColor, lightGrayOpacityColor } from '../constants/Color'
import { spacings, style } from '../constants/Fonts';
import { BaseStyle } from '../constants/Style';
import Carousal from '../components/Carousal'
import Header from '../components/Header'
import Product from '../components/ProductVertical';
import ChatButton from '../components/ChatButton';
import {
  SEE_ALL, SHOP_BY_PRODUCT_CATAGORY, BEST_SELLING, OUR_PRODUCT, STOREFRONT_DOMAIN, ADMINAPI_ACCESS_TOKEN, HOMEDECOR_OUR_PRODUCT_COLLECTION_ID,
  STOREFRONT_ACCESS_TOKEN, LOADER_NAME
} from '../constants/Constants'
import useShopify from '../hooks/useShopify';
import { useCart } from '../context/Cart';
import type { ShopifyProduct } from '../../@types';
import Toast from 'react-native-simple-toast';
import { logEvent } from '@amplitude/analytics-react-native';
import axios from 'axios';
import dynamicLinks from '@react-native-firebase/dynamic-links';
import { useDispatch, useSelector } from 'react-redux';
import { selectMenuItem } from '../redux/actions/menuActions';
import { useFocusEffect } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import LoaderKit from 'react-native-loader-kit'
import { clearWishlist } from '../redux/actions/wishListActions';
import { useThemes } from '../context/ThemeContext';
import { lightColors, darkColors } from '../constants/Color';
const { flex, alignJustifyCenter, flexDirectionRow, resizeModeCover, justifyContentSpaceBetween, borderRadius10, alignItemsCenter,
  textAlign, overflowHidden} = BaseStyle;

const HomeScreenHomeDecor = ({ navigation }: { navigation: any }) => {
  const selectedItem = useSelector((state) => state.menu.selectedItem);
  const { isDarkMode } = useThemes();
  const colors = isDarkMode ? darkColors : lightColors;
  const { addToCart, addingToCart, clearCart } = useCart();
  const [lineHeights, setLineHeights] = useState({});
  const [inventoryQuantities, setInventoryQuantities] = useState('');
  const [tags, setTags] = useState<string[][]>([]);
  const [options, setOptions] = useState([]);
  const [productVariantsIDS, setProductVariantsIDS] = useState([]);
  const [bestDealInventoryQuantities, setBestDealInventoryQuantities] = useState('');
  const [bestDealoptions, setBestDealOptions] = useState([]);
  const [bestDealProductVariantsIDS, setBestDealProductVariantsIDS] = useState([]);
  const [bestDealTags, setbestDealTags] = useState<string[][]>([]);
  const [products, setProducts] = useState([]);
  const [bestDealProducts, setBestDealProducts] = useState([]);
  const { queries } = useShopify();
  const [fetchCollections, { data: collectionData }] = queries.collections;
  const [fetchProducts, { data }] = queries.products;
  const [menuItems, setMenuItems] = useState([]);
  const [shopifyCollection, setShopifyCollection] = useState([])
  const [collectionsFetched, setCollectionsFetched] = useState(false);

  const dispatch = useDispatch();
  const scrollViewRef = useRef(null);

  const carouselData = [
    { id: 1, image: "https://firebasestorage.googleapis.com/v0/b/ecommerceapp-34078.appspot.com/o/bannerimages%2FHomeDecor%2FHomeDecorBanner.png?alt=media&token=ab63e4bb-4f07-43fd-adfa-cdc66fb2f86d" },
    { id: 2, image: "https://firebasestorage.googleapis.com/v0/b/ecommerceapp-34078.appspot.com/o/bannerimages%2FHomeDecor%2FHomeDecorBanner1.png?alt=media&token=8220b206-a92b-40b4-9d5a-4f5d407e2cdd" },
    { id: 3, image: "https://firebasestorage.googleapis.com/v0/b/ecommerceapp-34078.appspot.com/o/bannerimages%2FHomeDecor%2FHomeDecorBanner2.png?alt=media&token=68233ddc-e3ce-46ed-9383-645f5abad9a5" },
    { id: 4, image: "https://firebasestorage.googleapis.com/v0/b/ecommerceapp-34078.appspot.com/o/bannerimages%2FHomeDecor%2FHomeDecorBanner3.png?alt=media&token=352ad8aa-e52f-436f-9826-11d107318215" },
    { id: 5, image: "https://firebasestorage.googleapis.com/v0/b/ecommerceapp-34078.appspot.com/o/bannerimages%2FHomeDecor%2FHomeDecorBanner4.png?alt=media&token=c5a2292b-3e85-400c-9cb2-700d1846cdd2" }
  ];
  const GIF = { id: 1, gif: "https://firebasestorage.googleapis.com/v0/b/ecommerceapp-34078.appspot.com/o/6408d3b6-da25-4d6e-b2fd-a3ad2373f34a.gif?alt=media&token=62032173-f9ab-4bf8-ab21-619e007472e7" }

  useEffect(() => {
    logEvent('Home Screen HomeDecor Initialized');
  }, [])

  //best selling
  useEffect(() => {
    const fetchproduct = () => {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("X-Shopify-Access-Token", ADMINAPI_ACCESS_TOKEN);
      const graphql = JSON.stringify({
        query: `query MyQuery {
      collection(id: "gid://shopify/Collection/331992203417") {
        products(first: 10) {
          nodes {
            id
            images(first: 10) {
              nodes {
                src
                url
              }
            }
            title
            tags
            options(first:10){
              id
              name
              values
            }
            variants(first: 10) {
              nodes {
                price
                inventoryQuantity
                id
                title
                image {
                  originalSrc
                }
              }
            }
          }
        }
      }
    }`,
        variables: {}
      });
      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: graphql,
        redirect: "follow"
      };
      fetch(`https://${STOREFRONT_DOMAIN}/admin/api/2024-04/graphql.json`, requestOptions)
        .then((response) => response.text())
        .then((result) => {
          const fetchedProducts = JSON.parse(result);
          setBestDealProducts(fetchedProducts?.data?.collection?.products?.nodes);
          const inventoryQuantities = fetchedProducts?.data?.collection?.products?.nodes?.map((productEdge) => {
            return productEdge?.variants?.nodes?.map((variants) => variants?.inventoryQuantity);
          });
          setBestDealInventoryQuantities(inventoryQuantities)
          const fetchedOptions = fetchedProducts?.data?.collection?.products?.nodes.map((product) => product.options);
          setBestDealOptions(fetchedOptions);

          const productVariantData = fetchedProducts?.data?.collection?.products?.nodes.map((product) =>
            product.variants.nodes.map((variant) => ({
              id: variant?.id,
              title: variant?.title,
              inventoryQty: variant?.inventoryQuantity,
              image: variant?.image
            }))
          );
          setBestDealProductVariantsIDS(productVariantData);

          const fetchedTags = fetchedProducts?.data?.collection?.products?.nodes.map(productEdge => productEdge?.tags);
          setbestDealTags(fetchedTags)
        })
        .catch((error) => console.log(error));
    }
    fetchproduct();
  }, [])

  //our product
  useEffect(() => {
    const fetchproduct = () => {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("X-Shopify-Access-Token", ADMINAPI_ACCESS_TOKEN);
      const graphql = JSON.stringify({
        query: `query MyQuery {
        collection(id: "gid://shopify/Collection/331992137881") {
          products(first: 4) {
            nodes {
              id
              images(first: 4) {
                nodes {
                  src
                  url
                }
              }
              title
              tags
              options(first:4){
                id
                name
                values
              }
              variants(first: 4) {
                nodes {
                  price
                  inventoryQuantity
                  id
                  title
                  image {
                    originalSrc
                  }
                }
              }
            }
          }
        }
      }`,
        variables: {}
      });
      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: graphql,
        redirect: "follow"
      };
      fetch(`https://${STOREFRONT_DOMAIN}/admin/api/2024-04/graphql.json`, requestOptions)
        .then((response) => response.text())
        .then((result) => {
          const fetchedProducts = JSON.parse(result);
          setProducts(fetchedProducts?.data?.collection?.products?.nodes);
          const inventoryQuantities = fetchedProducts?.data?.collection?.products?.nodes?.map((productEdge) => {
            return productEdge?.variants?.nodes?.map((variants) => variants?.inventoryQuantity);
          });
          setInventoryQuantities(inventoryQuantities)
          const fetchedOptions = fetchedProducts?.data?.collection?.products?.nodes?.map((product) => product?.options);
          setOptions(fetchedOptions);

          const productVariantData = fetchedProducts?.data?.collection?.products?.nodes.map((product) =>
            product.variants.nodes.map((variant) => ({
              id: variant?.id,
              title: variant?.title,
              inventoryQty: variant?.inventoryQuantity,
              image: variant?.image
            }))
          );
          setProductVariantsIDS(productVariantData);

          const fetchedTags = fetchedProducts?.data?.collection?.products?.nodes.map(productEdge => productEdge?.tags);
          setTags(fetchedTags)
        })
        .catch((error) => console.log(error));
    }
    fetchproduct();
  }, [])

  //handel deep Links
  useEffect(() => {
    const handleInitialLink = async () => {
      const initialLink = await dynamicLinks().getInitialLink();
      if (initialLink) {
        handleDynamicLinks(initialLink);
      }
    };
    handleInitialLink();
    const unsubscribe = dynamicLinks().onLink(handleDynamicLinks);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      await fetchCollections({
        variables: {
          first: 150,
        },
      });
      await fetchProducts({
        variables: {
          first: 10,
        },
      });
      setCollectionsFetched(true);
    };

    fetchInitialData();
  }, [fetchCollections, fetchProducts]);

  useFocusEffect(
    useCallback(() => {
      if (collectionsFetched) {
        fetchMainMenu();
      }
    }, [collectionsFetched])
  );

  useEffect(() => {
    const index = menuItems.findIndex(item => item.title === selectedItem);
    if (index !== -1) {
      const itemWidth = 100;
      const offset = Math.max(0, (index - 3) * itemWidth);

      if (index >= menuItems.length - 3) {
        scrollViewRef.current.scrollTo({ x: offset, animated: true });
      }
    }
  }, [selectedItem, menuItems]);

  //onpress menu item
  const handleMenuPress = (item) => {
    logEvent(`Change theme from HomeDecor to Themename :${item}`);
    dispatch(selectMenuItem(item));
    dispatch(clearWishlist());
    clearCart()
  };

  //fetch menu item
  const fetchMainMenu = async () => {
    try {
      const response = await axios.post(
        `https://${STOREFRONT_DOMAIN}/api/2023-04/graphql.json`,
        {
          query: `
          {
            menu(handle: "main-menu") {
              items {
                title
                url
                type
                items {
                  title
                  id
                }
              }
            }
          }
        `,
        },
        {
          headers: {
            'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN,
            'Content-Type': 'application/json',
          },
        }
      );
      setMenuItems(response?.data?.data?.menu?.items);
      const filteredItems = response?.data?.data?.menu?.items?.filter(item =>
        item?.title?.toLowerCase() === selectedItem.toLowerCase()
      );
      filteredItems.forEach((item) => {


        let matchedCollectionsArray = [];
        item?.items?.forEach(selectedItem => {


          if (collectionData && collectionData?.collections && collectionData?.collections?.edges) {
            let matchedCollection = collectionData?.collections?.edges?.find(collection => {
              return collection?.node?.title === selectedItem?.title;
            });

            if (matchedCollection) {
              matchedCollectionsArray.push(matchedCollection?.node);
            }
          }
        });

        setShopifyCollection(matchedCollectionsArray);
      });
    } catch (error) {
      console.log('Error fetching main menu:', error);
    }
  };

  //handel handleDynamicDeepLinks
  const handleDynamicLinks = async (link) => {
    try {
      if (link && link.url) {
        let productId = link?.url?.split('=').pop();
        const productData = await fetchProductDetails(productId);
        navigation.navigate('ProductDetails', {
          product: productData?.product,
          variant: productData?.variants,
          inventoryQuantity: productData?.inventoryQuantities,
          tags: productData?.tags,
          option: productData?.options,
          ids: productData?.ids
        });
      } else {
        console.log('No link or URL found');
      }
    } catch (error) {
      console.error('Error handling dynamic link:', error);
    }
  }

  //fatch product exit in deeplink
  const fetchProductDetails = async (productId) => {
    const parts = productId.split('/');
    const lastValue = parts[parts.length - 1];
    try {
      const response = await axios.get(`https://${STOREFRONT_DOMAIN}/admin/api/2024-01/products/${lastValue}.json`, {
        headers: {
          'X-Shopify-Access-Token': ADMINAPI_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      });
      const product = response.data.product;
      const ids = product?.variants?.map((variant) => ({
        id: variant?.admin_graphql_api_id,
        title: variant?.title,
        inventoryQty: variant?.inventory_quantity,
        image: variant?.image
      }));
      return {
        product: product,
        variants: product?.variants.map((variant) => ({
          id: variant?.id,
          title: variant?.title,
          inventoryQuantity: variant?.inventory_quantity,
          options: variant?.option_values,
        })),
        inventoryQuantities: product?.variants.map((variant) => variant?.inventory_quantity),
        tags: product?.tags.split(','),
        options: product?.options.map((option) => ({
          name: option?.name,
          values: option?.values,
        })),
        ids: ids,
      };

    } catch (error) {
      console.error('Error fetching product details:', error);
    }
  };

  //for text layout
  const handleTextLayout = (title: any) => (event) => {
    const { lines } = event.nativeEvent;
    const newLineHeights = { ...lineHeights };
    newLineHeights[title] = lines.length > 1 ? 13 : 16;
    setLineHeights(newLineHeights);
  };

  //move to catalog page
  const onPressShopAll = () => {
    logEvent('SeeAll Button Pressed from HomeScreenDecor');
    navigation.navigate('CatalogStack')
  }

  //move to collection page
  const onPressCollection = (id: any, heading: any) => {
    logEvent(`See All our product Collection Button Pressed from HomeScreenDecor CollectionID: ${id} CollectionName: ${heading}`);
    navigation.navigate('Collections', {
      id: id, headingText: heading
    })
  }

  //get product variant
  const getVariant = (product: ShopifyProduct) => {
    if (product?.variants?.edges?.length > 0) {
      return product?.variants?.edges[0]?.node;
    } else if (product?.variants?.nodes?.length > 0) {
      return product?.variants?.nodes[0];
    } else {
      return null;
    }
  };

  //Add to Cart Product
  const addToCartProduct = async (variantId: any, quantity: any) => {
    logEvent(`Add To Cart Pressed variantId:${variantId} Qty:${quantity}`);
    await addToCart(variantId, quantity);
    Toast.show(`${quantity} item${quantity !== 1 ? 's' : ''} added to cart`);
  };

  const handleChatButtonPress = () => {
    // console.log('Chat button pressed');
    navigation.navigate("ShopifyInboxScreen")
  };

  return (
    <KeyboardAvoidingView style={[flex, { backgroundColor: colors.whiteColor }]} behavior="padding" enabled>
      <Header
        navigation={navigation}
        textinput={true}
        image={true}
        menuImage={true}
        shoppingCart={true}
        onPressShopByCatagory={onPressShopAll}
      />
      <View style={[styles.container, { backgroundColor: colors.whiteColor }, flex]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          ref={scrollViewRef}
        >
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={[
                styles.menuItem,
                selectedItem === item.title && styles.selectedMenuItem,
              ]}
              onPress={() => handleMenuPress(item.title)}
            >
              <Text style={[styles.menuText, { color: colors.blackColor }]}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: spacings.large }}>
          <Carousal
            data={carouselData.slice(0, 3)}
            dostsShow={true}
            renderItem={item => (
              <Image source={{ uri: item?.image }} style={[{ width: wp(91.8), height: hp(20) }, borderRadius10, resizeModeCover]} />
            )}
          />
          <View style={[{ width: "100%", marginVertical: 10 }, alignItemsCenter, justifyContentSpaceBetween, flexDirectionRow]}>
            <Text style={[styles.text, , { color: colors.blackColor }]}>{SHOP_BY_PRODUCT_CATAGORY}</Text>
            <Pressable onPress={onPressShopAll}>
              <Text style={{ color: redColor, fontSize: style.fontSizeNormal.fontSize, fontWeight: style.fontWeightThin1x.fontWeight }} >{SEE_ALL}</Text>
            </Pressable>
          </View>
          <View style={[{ width: wp(100), height: "auto", marginTop: 5 }, flexDirectionRow]}>
            <FlatList
              data={shopifyCollection.slice(0, 8)}
              renderItem={({ item }) => (
                <View style={[{ width: wp(24), height: hp(18) }, alignItemsCenter]}>
                  <Pressable style={[styles.card, overflowHidden, alignJustifyCenter, { borderColor: isDarkMode ? "transparent" : lightGrayOpacityColor }]} onPress={() => onPressCollection(item?.id, item?.title)}>
                    <Image source={{ uri: item?.image?.url }} style={[styles.categoryImage, resizeModeCover]} />
                  </Pressable>
                  <Text
                    style={[
                      styles.categoryName,
                      textAlign,
                      {
                        lineHeight: lineHeights[item?.title] || 10,
                        color: colors.blackColor,
                        paddingVertical: spacings.large,
                        fontWeight: style.fontWeightBold.fontWeight,
                        fontSize: style.fontSizeSmall.fontSize
                      }
                    ]}
                    onTextLayout={handleTextLayout(item?.title)}>{item?.title}</Text>
                </View>
              )}
              numColumns={4}
              keyExtractor={(item) => item?.id}
            />
          </View>
          <Text style={[styles.text, , { color: colors.blackColor, marginVertical: 10 }]}>{BEST_SELLING}</Text>
          <View style={[{ height: hp(30) }, alignJustifyCenter]}>
            {bestDealProducts?.length > 0 ? <FlatList
              data={bestDealProducts}
              renderItem={({ item, index }) => {
                return (
                  <Product
                    product={item}
                    onAddToCart={addToCartProduct}
                    loading={addingToCart?.has(getVariant(item)?.id ?? '')}
                    inventoryQuantity={bestDealInventoryQuantities[index]}
                    option={bestDealoptions[index]}
                    ids={bestDealProductVariantsIDS[index]}
                    width={wp(36)}
                    onPress={() => {
                      navigation.navigate('ProductDetails', {
                        product: item,
                        variant: getVariant(item),
                        inventoryQuantity: bestDealInventoryQuantities[index],
                        tags: bestDealTags[index],
                        option: bestDealoptions[index],
                        ids: bestDealProductVariantsIDS[index]
                      });
                    }}
                  />
                );
              }}
              showsHorizontalScrollIndicator={false}
              horizontal
            /> :
              <LoaderKit
                style={{ width: 50, height: 50 }}
                name={LOADER_NAME}
                color={colors.blackColor}
              />
            }
          </View>
          <Carousal
            data={carouselData.slice(3, 5)}
            dostsShow={true}
            renderItem={item => (
              <Image source={{ uri: item?.image }} style={[{ width: wp(91.5), height: hp(20) }, borderRadius10, resizeModeCover]} />
            )}
          />
          <View style={[{ width: "100%", marginVertical: 10 }, alignItemsCenter, justifyContentSpaceBetween, flexDirectionRow]}>
            <Text style={[styles.text, , { color: colors.blackColor }]}>{OUR_PRODUCT}</Text>
            <Text style={{ color: redColor, fontSize: style.fontSizeNormal.fontSize, fontWeight: style.fontWeightThin1x.fontWeight }} onPress={() => onPressCollection(HOMEDECOR_OUR_PRODUCT_COLLECTION_ID, OUR_PRODUCT)}>{SEE_ALL}</Text>
          </View>
          <View style={[{ height: hp(30) }, alignJustifyCenter]}>
            {products?.length > 0 ? <FlatList
              data={products}
              renderItem={({ item, index }) => {
                return (
                  <Product
                    product={item}
                    onAddToCart={addToCartProduct}
                    loading={addingToCart?.has(getVariant(item)?.id ?? '')}
                    inventoryQuantity={inventoryQuantities[index]}
                    option={options[index]}
                    ids={productVariantsIDS[index]}
                    width={wp(36)}
                    onPress={() => {
                      navigation.navigate('ProductDetails', {
                        product: item,
                        variant: getVariant(item),
                        inventoryQuantity: inventoryQuantities[index],
                        tags: tags[index],
                        option: options[index],
                        ids: productVariantsIDS[index]
                      });
                    }}
                  />
                );
              }}
              showsHorizontalScrollIndicator={false}
              horizontal
            /> :
              <LoaderKit
                style={{ width: 50, height: 50 }}
                name={LOADER_NAME}
                color={colors.blackColor}
              />
            }
          </View>
          <FastImage
            source={{ uri: GIF.gif }}
            style={[
              { width: wp(100), height: hp(30), marginVertical: spacings.large },
            ]}
          />
        </ScrollView>
        <ChatButton onPress={handleChatButtonPress} />
      </View>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: whiteColor,
    paddingVertical: spacings.small
  },
  text: {
    fontSize: style.fontSizeNormal2x.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: blackColor,
    fontFamily: 'GeneralSans-Variable'
  },
  card: {
    width: wp(20),
    height: wp(20),
    borderRadius: 100,
    borderWidth: 0.5,
    paddingVertical: spacings.small,
  },

  categoryImage: {
    width: "100%",
    height: "110%",
    borderRadius: 10,
  },
  categoryName: {
    fontSize: style.fontSizeNormal.fontSize,
    color: whiteColor,
    fontWeight: style.fontWeightThin1x.fontWeight,
  },

  image: {
    width: 100,
    height: 100,
    marginBottom: 5,
  },
  menuItem: {
    paddingHorizontal: spacings.normal,
    paddingVertical: spacings.xxsmall,
    marginRight: spacings.large,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  selectedMenuItem: {
    borderBottomColor: redColor,
    borderBottomWidth: 2,
    paddingVertical: spacings.xxsmall,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: blackColor,
  },
});

export default HomeScreenHomeDecor;
