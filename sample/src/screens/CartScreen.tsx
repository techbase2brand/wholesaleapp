import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, StyleSheet, Text, Image, ActivityIndicator, Pressable, RefreshControl, TouchableOpacity, ImageBackground, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/Entypo';
import { useShopifyCheckoutSheet } from '@shopify/checkout-sheet-kit';
import useShopify from '../hooks/useShopify';
import type { CartItem, CartLineItem } from '../../@types';
import { Colors, useTheme } from '../context/Theme';
import { useCart } from '../context/Cart';
import Toast from 'react-native-simple-toast';
import { blackColor, redColor, whiteColor, lightShadeBlue, mediumGray, grayColor } from '../constants/Color'
import { spacings, style } from '../constants/Fonts';
import { BaseStyle } from '../constants/Style';
import { widthPercentageToDP as wp, heightPercentageToDP as hp, } from '../utils';
import {
  SUBTOTAL, YOUR_CART_IS_EMPTY, AN_ERROR_OCCURED, LOADING_CART, TOTAL, TAXES, QUNATITY, CHECKOUT, STOREFRONT_DOMAIN, STOREFRONT_ACCESS_TOKEN,
  ADMINAPI_ACCESS_TOKEN, YOU_MIGHT_LIKE, LOADER_NAME
} from '../constants/Constants';
import { logEvent } from '@amplitude/analytics-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { removeProductFromCart, removeProductInCart } from '../redux/actions/cartActions';
import { BACKGROUND_IMAGE } from '../assests/images'
import AntDesign from 'react-native-vector-icons/dist/AntDesign';
import Header from '../components/Header';
import { useThemes } from '../context/ThemeContext';
import { lightColors, darkColors } from '../constants/Color';
import axios from 'axios';
import LoaderKit from 'react-native-loader-kit'
import { addToWishlist, removeFromWishlist } from '../redux/actions/wishListActions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatButton from '../components/ChatButton';
const { flex, alignJustifyCenter, flexDirectionRow, resizeModeCover, justifyContentSpaceBetween, borderRadius10, alignItemsCenter, borderRadius5, textAlign, alignItemsFlexEnd, resizeModeContain } = BaseStyle;

function CartScreen({ navigation }: { navigation: any }): React.JSX.Element {
  const { isDarkMode } = useThemes();
  const themecolors = isDarkMode ? darkColors : lightColors;
  const ShopifyCheckout = useShopifyCheckoutSheet();
  const [refreshing, setRefreshing] = React.useState(false);
  const { cartId, checkoutURL, totalQuantity, removeFromCart, addingToCart, addToCart, removeOneFromCart } = useCart();
  const { queries } = useShopify();
  const [fetchCart, { data, loading, error }] = queries.cart;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const dispatch = useDispatch();
  const userLoggedIn = useSelector(state => state.auth.isAuthenticated);
  const [upSellingproducts, setUpSellingProducts] = useState([]);
  const [loadingProductId, setLoadingProductId] = useState(null);
  const wishList = useSelector(state => state.wishlist.wishlist);
  const [shopCurrency, setShopCurrency] = useState('');

  useEffect(() => {
    if (cartId) {
      fetchCart({
        variables: {
          cartId,
        },
      });
    }
  }, [fetchCart, cartId]);

  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const shopCurrency = await AsyncStorage.getItem('shopCurrency');
        if (shopCurrency) {
          setShopCurrency(shopCurrency);
        }
      } catch (error) {
        console.error('Error fetching shop currency:', error);
      }
    };
    fetchCurrency();
  }, []);

  const fetchCartDetail = async () => {
    try {
      const response = await axios.post(`https://${STOREFRONT_DOMAIN}/api/2024-01/graphql.json`, {
        query: `
          {
            cart(id: "${cartId}") {
              id
              lines(first: 10) {
                edges {
                  node {
                    id
                    merchandise {
                      ... on ProductVariant {
                        product {
                          id
                        }
                      }
                    }
                    quantity
                  }
                }
              }
            }
          }
        `
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN
        }
      });

      const productIds = response.data?.data?.cart?.lines?.edges.map(edge => {
        const fullId = edge.node.merchandise?.product?.id || '';
        return fullId.split('/').pop();
      }) || [];
      if (productIds) {
        fetchProductMetafields(productIds)
      }
    } catch (error) {
      console.error("Error fetching cart details:", error);
    }
  };

  const extractProductFields = (product) => {
    return {
      id: product.id,
      title: product.title,
      inventoryQuantities: product.variants.map(variant => variant.inventory_quantity),
      imageUrls: product.images.map(image => image.src),
      price: product.variants.map(variant => variant.price),
      variantId: product.variants.map(variant => variant.admin_graphql_api_id),
    };
  };

  const fetchProductMetafields = async (productID) => {
     try {
      const response = await axios.get(`https://${STOREFRONT_DOMAIN}/admin/api/2024-07/products/${productID}/metafields.json`, {
        headers: {
          'X-Shopify-Access-Token': ADMINAPI_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      });

      const metafields = response.data.metafields;

      const allMetafieldValues = [];

      metafields.forEach(metafield => {
        if (metafield.value) {
          try {
            const values = JSON.parse(metafield.value);
            allMetafieldValues.push(...values);
          } catch (error) {
            console.error('Error parsing metafield value:', error);
          }
        }
      });

      const productIds = allMetafieldValues?.map(id => id.replace('gid://shopify/Product/', ''))
        .join(','); // Join IDs with commas

      if (productIds.length > 0) {
        const productsResponse = await axios.get(`https://${STOREFRONT_DOMAIN}/admin/api/2024-07/products.json?ids=${productIds}`, {
          headers: {
            'X-Shopify-Access-Token': ADMINAPI_ACCESS_TOKEN,
            'Content-Type': 'application/json'
          }
        });

        const products = productsResponse.data.products;

        const productDetails = products.map(product => extractProductFields(product));
        setUpSellingProducts(productDetails);

      } else {
        console.log('No metafield values found to fetch products.');
        setUpSellingProducts([]);
      }

    } catch (error) {
      console.error('Error fetching metafields:', error);
    }
  };

  useEffect(() => {
    logEvent('CartScreen');
    fetchCartDetail();
  }, [])

  const onRefresh = useCallback(() => {
    logEvent('onRefresh cart ');
    setRefreshing(true);
    fetchCart({
      variables: {
        cartId,
      },
    }).then(() => setRefreshing(false));
  }, [cartId, fetchCart]);

  const presentCheckout = async () => {
    logEvent('Click CheckOut ');
    if (!userLoggedIn) {
      navigation.navigate("AuthStack");
      Toast.show("Please First complete the registration process")
    } else {
      if (checkoutURL) {
        // console.log(checkoutURL)
        // ShopifyCheckout.present(checkoutURL);
        navigation.navigate('ShopifyCheckOut', {
          url: checkoutURL,
        });
        logEvent('Open CheckOut ');
      } else {
        console.log('Checkout URL is not available');
      }
    }
  };

  const onPressContinueShopping = () => {
    logEvent(`Press Continue Shopping Button in Cart Screen`);
    navigation.navigate('HomeScreen')
  }

  if (error) {
    console.error("Error fetching cart:", error);
    return (
      <ImageBackground source={isDarkMode ? "" : BACKGROUND_IMAGE} style={[styles.loading, alignJustifyCenter, flex, { backgroundColor: themecolors.whiteColor }]}>
        <Text style={[styles.loadingText, { color: themecolors.blackColor }]}>
          {AN_ERROR_OCCURED}
        </Text>
        <Text style={[styles.loadingText, { color: themecolors.blackColor }]}>
          {error?.name} {error?.message}
        </Text>
      </ImageBackground>
    );
  }

  if (loading) {
    return (
      <ImageBackground source={isDarkMode ? "" : BACKGROUND_IMAGE} style={[styles.loading, alignJustifyCenter, flex, { backgroundColor: themecolors.whiteColor }]}>
        <Header
          backIcon={true}
          navigation={navigation}
          text={"Cart"} />
        <View style={[flex, alignJustifyCenter]}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>{LOADING_CART}</Text>
        </View>
      </ImageBackground>
    );
  }

  if (!data || !data.cart || data?.cart?.lines?.edges?.length === 0 || !cartId) {
    return (
      <ImageBackground source={isDarkMode ? "" : BACKGROUND_IMAGE} style={[styles.loading, alignJustifyCenter, flex, { backgroundColor: themecolors.whiteColor }]}>
        <Header
          backIcon={true}
          navigation={navigation}
          text={"Cart"} />
        <View style={[flex, alignJustifyCenter]}>
          <Icon name="shopping-bag" size={60} color={themecolors.lightShadeBlue} />
          <Text style={[styles.loadingText, { color: themecolors.blackColor }]}>{YOUR_CART_IS_EMPTY}</Text>
          <TouchableOpacity style={[styles.addToCartButton, borderRadius10]} onPress={onPressContinueShopping}>
            <Text style={[styles.costBlockTextStrong, textAlign, { color: whiteColor }]}>
              Go to Shopping
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  const handleRemoveToCart = (variantId: string,) => {
    removeFromCart(variantId);
    dispatch(removeProductFromCart(variantId));
    Toast.show('Item removed from cart')
    logEvent(`Item removed from cart variantId:${variantId} `);
  };

  const getTotalAmount = () => {
    let totalAmount = 0;
    let currencyCode = '';
    if (data?.cart?.lines?.edges && data?.cart?.lines?.edges?.length > 0) {
      currencyCode = data?.cart?.lines?.edges[0]?.node?.merchandise?.price?.currencyCode;
      data?.cart?.lines?.edges.forEach(({ node }) => {
        const itemPrice = parseFloat(node?.merchandise?.price?.amount);
        const itemQuantity = node?.quantity;
        const itemTotal = itemPrice * itemQuantity;
        totalAmount += itemTotal;
      });
    }
    return { totalAmount: totalAmount?.toFixed(2), currencyCode };
  };

  const addValues = (value1: any, value2: any) => {
    if (isNaN(value1) || isNaN(value2)) {
      return '--';
    }
    return value1 + value2;
  }

  const trimcateText = (text) => {
    const words = text.split(' ');
    if (words.length > 4) {
      return words.slice(0, 4).join(' ') + '...';
    }
    return text;
  };

  const totalAmount = parseFloat(getTotalAmount()?.totalAmount);
  const taxAmount = data?.cart?.cost?.totalTaxAmount ? parseFloat(price(data?.cart?.cost?.totalTaxAmount)) : 0;
  const sum = addValues(totalAmount, taxAmount);

  const onAddToCartRelatedProduct = async (variantId, quantity) => {
    setLoadingProductId(variantId);
    await addToCart(variantId, quantity)
    setLoadingProductId(null);
    logEvent(`upselling Item add in cart variantId:${variantId} `);
  };

  const getIsFavSelected = (productId) => {
    const isFav = wishList.some(item => item?.id === productId);
    return isFav;
  }

  const handlePress = (item) => {
    if (!getIsFavSelected(item?.id)) {
      dispatch(addToWishlist(item));
      logEvent(`upselling Item add in fav`);
    } else {
      dispatch(removeFromWishlist(item?.id));
      logEvent(`upselling Item remove in fav`);
    }
  };

  const handleChatButtonPress = () => {
    // console.log('Chat button pressed');
    navigation.navigate("ShopifyInboxScreen")
  };

  return (
    <ImageBackground source={isDarkMode ? "" : BACKGROUND_IMAGE} style={[styles.loading, alignJustifyCenter, flex, { backgroundColor: themecolors.whiteColor }]}>
      <SafeAreaView>
        <Header
          backIcon={true}
          navigation={navigation}
          text={"Cart"} />
        <View style={{ height: hp(80) }}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            <View style={styles.productList}>
              {data?.cart?.lines?.edges.map(({ node }) => (
                <CartItem
                  key={node?.merchandise?.id}
                  item={node}
                  quantity={node?.quantity}
                  loading={addingToCart?.has(node?.id)}
                  onRemove={(variantId) => handleRemoveToCart(variantId)}
                />
              ))}

            </View>
            {upSellingproducts?.length != 0 ? <View style={styles.relatedProductsContainer}>
              <Text style={[styles.relatedProductsTitle, { color: themecolors.blackColor }]}>{YOU_MIGHT_LIKE}</Text>
              <FlatList
                data={upSellingproducts}
                renderItem={({ item }) => {
                  const inventoryQuantity = item?.inventoryQuantities[0] || 0;
                  const isFavSelected = getIsFavSelected(item?.id);
                  return (
                    <View
                      style={[styles.relatedProductItem, alignJustifyCenter, { backgroundColor: isDarkMode ? grayColor : "transparnet" }]}
                    >
                      <View style={{ width: "100%", borderWidth: .5, borderColor: themecolors.lightGrayOpacityColor, marginBottom: spacings.small, borderRadius: 10, alignItems: "center" }}>
                        <Image
                          source={{ uri: item?.imageUrls[0] }}
                          style={[styles.relatedProductImage, borderRadius10, resizeModeContain]}
                        />
                      </View>
                      <View style={[{ width: "100%", height: hp(9) }]}>
                        <Text style={[styles.relatedproductName, { color: themecolors.blackColor }]}>{trimcateText(item?.title)}</Text>
                        <Text
                          style={[
                            styles.relatedproductPrice,
                            { paddingHorizontal: spacings.small, color: themecolors.blackColor },
                          ]}
                        >
                          {item?.price[0]} {shopCurrency}
                        </Text>
                      </View>
                      <View style={[{ width: "100%", flexDirection: "row" }, justifyContentSpaceBetween, alignItemsCenter]}>
                        {inventoryQuantity === 0 ? (
                          <Pressable
                            style={[styles.relatedAddtocartButton, borderRadius10, alignJustifyCenter]}
                          >
                            <Text style={styles.addToCartButtonText}>Out of stock</Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            style={[styles.relatedAddtocartButton, borderRadius10, alignJustifyCenter]}
                            onPress={() => onAddToCartRelatedProduct(item?.variantId[0], 1)}
                            disabled={loadingProductId === item?.variantId[0]}
                          >
                            {loadingProductId === item?.variantId[0] ? (
                              <ActivityIndicator color={whiteColor} />
                            ) : (
                              <Text style={styles.addToCartButtonText}>Add to Cart</Text>
                            )}
                          </Pressable>
                        )}
                        <TouchableOpacity style={[alignJustifyCenter, styles.relatedProductfavButton, { backgroundColor: whiteColor, borderColor: themecolors.redColor }]} onPress={() => handlePress(item)}>
                          <AntDesign
                            name={isFavSelected ? "heart" : "hearto"}
                            size={18}
                            color={redColor}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                }}
                horizontal
                keyExtractor={(index) => index?.toString()}
                showsHorizontalScrollIndicator={false}
              />
            </View>
              :
              <View style={{ width: wp(100), alignItems: "center", justifyContent: "center", height: hp(15) }}>
                <LoaderKit
                  style={{ width: 50, height: 50 }}
                  name={LOADER_NAME}
                  color={themecolors.blackColor}
                />
                <Text>Loading Products...</Text>
              </View>}
            <View style={styles.costContainer}>
              <View style={[styles.costBlock, justifyContentSpaceBetween, flexDirectionRow]}>
                <Text style={styles.costBlockText}>{SUBTOTAL}</Text>
                <Text style={[styles.costBlockText, { color: themecolors.blackColor }]}>
                  {getTotalAmount().totalAmount} {getTotalAmount().currencyCode}
                </Text>
              </View>

              <View style={[styles.costBlock, justifyContentSpaceBetween, flexDirectionRow]}>
                <Text style={styles.costBlockText}>{TAXES}</Text>
                <Text style={[styles.costBlockText, { color: themecolors.blackColor }]}>
                  {price(data?.cart?.cost?.totalTaxAmount)}
                </Text>
              </View>

              <View style={[styles.costBlock, justifyContentSpaceBetween, flexDirectionRow, { borderTopColor: colors.border, borderTopWidth: 1, marginTop: spacings.large }]}>
                <Text style={[styles.costBlockTextStrong, { color: themecolors.blackColor }]}>{TOTAL}</Text>
                <Text style={[styles.costBlockTextStrong, { color: themecolors.blackColor }]}>
                  {sum.toFixed(2)} {getTotalAmount().currencyCode}
                </Text>
              </View>
              <Text style={{
                fontSize: style.fontSizeNormal1x.fontSize,
                marginVertical: spacings.Large2x,
                fontWeight: style.fontWeightThin1x.fontWeight,
                lineHeight: 20,
                color: themecolors.blackColor,
              }}>Note : Shipping will be calculated at checkout.</Text>

            </View>
          </ScrollView>
          <ChatButton onPress={handleChatButtonPress} />
        </View>
        {totalQuantity > 0 && (
          <Pressable
            style={[styles.cartButton, borderRadius10, alignJustifyCenter]}
            disabled={totalQuantity === 0}
            onPress={presentCheckout}>
            <Text style={[styles.cartButtonText, textAlign]}>{CHECKOUT}</Text>

          </Pressable>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

function price(value: { amount: string; currencyCode: string }) {
  if (!value) {
    return '-';
  }

  const { amount, currencyCode } = value;
  return `${amount} ${currencyCode}`;
}

function CartItem({
  item,
  quantity,
  onRemove,
  loading,
}: {
  item: CartLineItem;
  quantity: number;
  loading?: boolean;
  onRemove: (variantId: string, quantityToRemove: number) => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { isDarkMode } = useThemes();
  const themecolors = isDarkMode ? darkColors : lightColors;
  const [productquantity, setProductQuantity] = useState(quantity);
  const handleRemoveItem = () => {
    onRemove(item.id);
  };

  const trimcateText = (text) => {
    const words = text.split(' ');
    if (words.length > 4) {
      return words.slice(0, 4).join(' ') + '...';
    }
    return text;
  };
  return (
    <View
      key={item?.id}
      style={{
        ...styles.productItem,
        ...(loading ? styles.productItemLoading : {}),
        borderWidth: 1, borderColor: themecolors.mediumGray, backgroundColor: isDarkMode ? grayColor : whiteColor
      }}>
      <Image
        resizeMethod="resize"
        style={[styles.productImage, resizeModeCover, borderRadius5]}
        alt={item?.merchandise?.image?.altText}
        source={{ uri: item?.merchandise?.image?.url }}
      />
      <View style={[styles.productText, flex, alignJustifyCenter, flexDirectionRow]}>
        <View style={[flex]}>
          <Text style={[styles.productTitle, { color: themecolors.blackColor }]}>
            {trimcateText(item?.merchandise?.product?.title)}
          </Text>
          <Text style={[styles.productPrice, { color: themecolors.blackColor }]}>
            {price(item?.merchandise?.price)}
          </Text>

        </View>
        <View>
          <Pressable style={[styles.removeButton, alignItemsFlexEnd]} onPress={handleRemoveItem}>
            {loading ? (
              <ActivityIndicator size="small" />
            ) : (

              <AntDesign
                name={"delete"}
                size={18}
                color={redColor}
              />
            )}
          </Pressable>
          <Text style={[styles.productDescription, { color: themecolors.blackColor }]}>{QUNATITY}: {quantity}</Text>

        </View>
      </View>
    </View >
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    loading: {
      padding: 2,
    },
    loadingText: {
      marginVertical: spacings.Large2x,
      color: colors.text,
    },
    scrollView: {
      paddingBottom: spacings.xLarge,
    },
    cartButton: {
      width: 'auto',
      height: hp(6),
      left: 0,
      right: 0,
      marginHorizontal: spacings.large,
      padding: spacings.large,
      backgroundColor: redColor,
      fontWeight: style.fontWeightThin1x.fontWeight,
    },
    cartButtonText: {
      fontSize: style.fontSizeMedium.fontSize,
      lineHeight: 20,
      color: colors.secondaryText,
      fontWeight: style.fontWeightThin1x.fontWeight,
    },
    cartButtonTextSubtitle: {
      fontSize: style.fontSizeSmall2x.fontSize,
      color: colors.textSubdued,
      fontWeight: style.fontWeightThin1x.fontWeight,
    },
    productList: {
      marginVertical: spacings.xLarge,
      paddingHorizontal: spacings.xLarge,
    },
    productItem: {
      display: 'flex',
      flexDirection: 'row',
      marginBottom: spacings.large,
      padding: spacings.large,
      backgroundColor: whiteColor,
      borderRadius: 5,
    },
    productItemLoading: {
      opacity: 0.6,
    },
    productText: {
      paddingLeft: 10,
      display: 'flex',
      color: colors.textSubdued
    },
    productTitle: {
      fontSize: style.fontSizeNormal1x.fontSize,
      marginBottom: spacings.small2x,
      fontWeight: style.fontWeightThin1x.fontWeight,
      lineHeight: 20,
      color: blackColor,
    },
    productDescription: {
      fontSize: style.fontSizeNormal.fontSize,
      color: colors.textSubdued,
      padding: spacings.xLarge
    },
    productPrice: {
      fontSize: style.fontSizeNormal.fontSize,
      fontWeight: style.fontWeightThin1x.fontWeight,
      color: blackColor,
    },
    removeButton: {
      marginRight: spacings.xLarge,
      marginTop: spacings.xSmall,
      padding: spacings.large,
    },
    removeButtonText: {
      color: colors.textSubdued,
    },
    productImage: {
      width: wp(13),
      height: hp(10),
    },
    costContainer: {
      marginBottom: spacings.xLarge,
      marginHorizontal: spacings.Large1x,
      paddingTop: spacings.xLarge,
      paddingBottom: hp(10),
      paddingHorizontal: spacings.xsmall,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    costBlock: {
      display: 'flex',
      padding: spacings.small2x,
    },
    costBlockText: {
      fontSize: style.fontSizeNormal.fontSize,
      color: colors.textSubdued,
    },
    costBlockTextStrong: {
      fontSize: style.fontSizeNormal2x.fontSize,
      color: colors.text,
      fontWeight: style.fontWeightThin1x.fontWeight,
    },
    addToCartButton: {
      fontSize: style.fontSizeExtraExtraSmall.fontSize,
      backgroundColor: redColor,
      paddingVertical: spacings.large,
      paddingHorizontal: spacings.xxxxLarge
    },
    quantityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: wp(22),
      backgroundColor: whiteColor,
      paddingHorizontal: 9,
      paddingVertical: 2,
      justifyContent: "center",
      borderRadius: 5,
      borderColor: redColor,
    },
    quantityButton: {
      paddingHorizontal: 8,
      borderRadius: 5,
      color: redColor,
      fontSize: 16,
      fontWeight: 'bold',
    },
    quantity: {
      paddingHorizontal: 12,
      paddingVertical: 2,
      fontSize: 16,
      fontWeight: 'bold',
      color: redColor,
    },
    relatedProductsContainer: {
      width: "100%",
      marginTop: spacings.xLarge,
    },
    relatedProductsTitle: {
      fontSize: style.fontSizeLarge.fontSize,
      fontWeight: style.fontWeightMedium.fontWeight,
      color: blackColor,
      paddingHorizontal: spacings.large
    },
    relatedProductItem: {
      width: wp(40),
      margin: spacings.small,
      padding: spacings.large,
      borderRadius: 5
    },
    relatedProductImage: {
      width: wp(30),
      height: wp(30),
      marginVertical: spacings.large,
    },
    relatedproductName: {
      fontSize: style.fontSizeSmall2x.fontSize, fontWeight: style.fontWeightThin1x.fontWeight,
    },
    relatedproductPrice: {
      fontSize: style.fontSizeSmall1x.fontSize,
      fontWeight: style.fontWeightThin1x.fontWeight,
      fontFamily: 'GeneralSans-Variable'
    },
    relatedAddtocartButton: {
      fontSize: style.fontSizeExtraExtraSmall.fontSize,
      width: "68%",
      backgroundColor: redColor,
      padding: spacings.normal,
    },
    addToCartButtonText: {
      fontSize: style.fontSizeNormal.fontSize,
      lineHeight: 20,
      color: whiteColor,
      fontWeight: style.fontWeightThin1x.fontWeight,
    },
    relatedProductfavButton: {
      width: wp(10),
      height: hp(3.8),
      right: 0,
      zIndex: 10,
      borderWidth: 1,
      borderRadius: 10,
    },
  });
}

export default CartScreen;
