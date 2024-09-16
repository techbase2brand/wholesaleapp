import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ImageBackground, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp, } from '../utils';
import { spacings, style } from '../constants/Fonts';
import { BaseStyle } from '../constants/Style';
import { whiteColor, blackColor, grayColor, redColor, mediumGray } from '../constants/Color';
import { SHIPPING_ADDRESS, MY_WISHLIST, ORDERS } from '../constants/Constants';
import Header from '../components/Header'
import AntDesign from 'react-native-vector-icons/dist/AntDesign';
import Fontisto from 'react-native-vector-icons/dist/Fontisto';
import Ionicons from 'react-native-vector-icons/dist/Ionicons';
import AddAddressModal from '../components/Modal/AddAddressModal';
import { removeFromWishlist } from '../redux/actions/wishListActions';
import { useDispatch, useSelector } from 'react-redux';
import { logEvent } from '@amplitude/analytics-react-native';
import { BACKGROUND_IMAGE } from '../assests/images';
import { STOREFRONT_DOMAIN, ADMINAPI_ACCESS_TOKEN } from '../constants/Constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../context/Cart';
import Toast from 'react-native-simple-toast';
import { useThemes } from '../context/ThemeContext';
import { lightColors, darkColors } from '../constants/Color';
import AddReviewModal from '../components/Modal/AddReviewModal';
import ChatButton from '../components/ChatButton';
const { alignJustifyCenter, textAlign, positionAbsolute, resizeModeContain, flexDirectionRow, flex, borderRadius10, alignItemsCenter, borderRadius5 } = BaseStyle;

const UserDashboardScreen = () => {
  const selectedItem = useSelector((state) => state.menu.selectedItem);
  const { addToCart, addingToCart } = useCart();
  const navigation = useNavigation()
  const route = useRoute();
  const ordersList = route.params?.orderList;
  const customerAddresses = route.params?.address;
  const wishlistObject = useSelector(state => state.wishlist);
  const wishList = wishlistObject?.wishlist;
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [defaultAddressId, setDefaultAddressId] = useState(null);
  const [loadingProductId, setLoadingProductId] = useState(null)
  const dispatch = useDispatch();
  const { isDarkMode } = useThemes();
  const colors = isDarkMode ? darkColors : lightColors;
  const [shopCurrency, setShopCurrency] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [productId, setProductId] = useState("");
  const [customerName, setCustomerName] = useState('');
  useEffect(() => {
    logEvent('UserDashboardScreen Initialized');
  }, [])

  useEffect(() => {
    if (customerAddresses?.length === 1) {
      setDefaultAddressId(customerAddresses[0].id);
      setSelectedAddressId(customerAddresses[0].id);
    }
  }, [customerAddresses]);

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

  useEffect(() => {
    const fetchUserDetails = async () => {
      const userDetails = await AsyncStorage.getItem('userDetails')
      const userAddress = await AsyncStorage.getItem('isDefaultAddress')
      if (userAddress) {
        setDefaultAddressId(JSON.parse(userAddress));
      }
      if (userDetails) {
        const userDetailsObject = JSON.parse(userDetails);
        const userId = userDetailsObject?.customer ? userDetailsObject?.customer.id : userDetailsObject?.id;
        setCustomerId(userId)
      }
    };
    fetchUserDetails();
  }, [customerId, defaultAddressId]);

  const handlePress = (item) => {
    logEvent(`removed from WishList ${item}`);
    dispatch(removeFromWishlist(item));
  };

  const onPressContinueShopping = (title: string) => {
    logEvent(`Press Continue Shopping Button in ${title} Screen`);
    navigation.navigate('HomeScreen')
  }

  const onPressAddAddress = () => {
    logEvent(`Press Add Address Modal`);
    setModalVisible(true)
  }

  const setDefaultAddress = async (addressId) => {
    logEvent(`Press Set Default Address Button`);
    try {
      const response = await fetch(`https://${STOREFRONT_DOMAIN}/admin/api/2023-01/customers/${customerId}/addresses/${addressId}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': ADMINAPI_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          address: {
            id: addressId,
            default: true,
          }
        }),
      });
      await AsyncStorage.removeItem('isDefaultAddress');
      const data = await response.json();
      await AsyncStorage.setItem('isDefaultAddress', JSON.stringify(addressId));
      setDefaultAddressId(addressId);
      logEvent(`Seccess setting default address`);
      // console.log('Set default address response:', data);
    } catch (error) {
      console.error('Error setting default address:', error);
      logEvent(`Error setting default address`);
    }
  }

  const addToCartProduct = async (item: any, quantity: any) => {
    const variantId = item?.variants?.edges ? item?.variants?.edges[0]?.node?.id : item?.variants?.nodes ? item?.variants?.nodes[0].id : item?.variants?.[0]?.admin_graphql_api_id ? item?.variants[0]?.admin_graphql_api_id : item.variantId[0];
    // console.log(variantId)
    setLoadingProductId(variantId);
    await addToCart(variantId, quantity);
    Toast.show(`${quantity} item${quantity !== 1 ? 's' : ''} added to cart`);
    setLoadingProductId(null);
    logEvent(`Add To Cart  Product variantId:${variantId} Qty:${quantity}`);
  };

  const openReviewModal = (item) => {
    const productIds = item.line_items.map(lineItem => lineItem.product_id);
    console.log("Product IDs:", productIds);
    const fullName = `${item?.customer?.first_name || ''} ${item?.customer?.last_name || ''}`;
    console.log("full name:", fullName);
    setProductId(productIds)
    setCustomerName(fullName)
    setIsModalVisible(true)
  };

  const handleChatButtonPress = () => {
    // console.log('Chat button pressed');
    navigation.navigate("ShopifyInboxScreen")
  };

  return (
    <KeyboardAvoidingView
      style={[flex]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ImageBackground style={[styles.container, flex, { backgroundColor: colors.whiteColor }]} source={isDarkMode ? '' : BACKGROUND_IMAGE}>
        <Header backIcon={true} text={route.params?.from} navigation={navigation} />
        {
          route.params?.from === ORDERS &&
          (ordersList && ordersList.length > 0 ?
            <View style={[styles.detailsBox, { backgroundColor: isDarkMode ? grayColor : "transparent" }]}>
              <FlatList
                data={ordersList}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => {

                  return (
                    <View style={{ padding: spacings.large }}>
                      {/* <Text style={styles.itemText}>Order ID: {item.id}</Text>
                    <Text style={styles.itemText}>Order Total: {item.total ? item.total : item.total_price}</Text> */}
                      {item?.line_items?.map((Item, index) => {

                        return (
                          <View key={index} style={{ marginVertical: 10, padding: spacings.large, borderWidth: 1, width: "100%", borderRadius: 10 }}>
                            <View style={[flexDirectionRow]}>
                              <View style={{ width: "25%" }}>
                                <Text style={[styles.itemText, { color: colors.blackColor }]}>Order ID</Text>
                              </View>
                              <View style={{ width: "10%" }}>
                                <Text style={[styles.itemText, { color: colors.blackColor }]}>:</Text>
                              </View>
                              <View style={{ width: "75%" }}>
                                <Text style={[styles.itemText, { color: colors.blackColor }]}>{item.id}</Text>
                              </View>
                            </View>
                            <View style={[flexDirectionRow]}>
                              <View style={{ width: "25%" }}>
                                <Text style={[styles.itemText, { color: colors.blackColor }]}>Name</Text>
                              </View>
                              <View style={{ width: "10%" }}>
                                <Text style={[styles.itemText, { color: colors.blackColor }]}>:</Text>
                              </View>
                              <View style={{ width: "65%" }}>
                                <Text style={[styles.itemText, { color: colors.blackColor }]}>{Item.title}</Text>
                              </View>
                            </View>
                            {Item?.variant_title && <View style={[flexDirectionRow]}>
                              <View style={{ width: "25%" }}>
                                <Text style={[styles.itemText, { color: colors.blackColor }]}>Variant</Text>
                              </View>
                              <View style={{ width: "10%" }}>
                                <Text style={[styles.itemText, { color: colors.blackColor }]}>:</Text>
                              </View>
                              <View style={{ width: "75%" }}>
                                <Text style={[styles.itemText, { color: colors.blackColor }]}>{Item?.variant_title}</Text>
                              </View>
                            </View>}
                            <View style={[flexDirectionRow]}>
                              <View style={{ width: "25%" }}>
                                <Text style={[styles.itemText, { color: colors.blackColor }]}>Quantity</Text>
                              </View>
                              <View style={{ width: "10%" }}>
                                <Text style={[styles.itemText, { color: colors.blackColor }]}>:</Text>
                              </View>
                              <View style={{ width: "75%" }}>
                                <Text style={[styles.itemText, { color: colors.blackColor }]}>{Item.quantity}</Text>
                              </View>
                            </View>
                            <View style={[flexDirectionRow]}>
                              <View style={{ width: "25%" }}>
                                <Text style={[styles.itemText, { color: colors.blackColor }]}>Price</Text>
                              </View>
                              <View style={{ width: "10%" }}>
                                <Text style={[styles.itemText, { color: colors.blackColor }]}>:</Text>
                              </View>
                              <View style={{ width: "75%" }}>
                                <Text style={[styles.itemText, { color: colors.blackColor }]}>{Item.price} {shopCurrency}</Text>
                              </View>
                            </View>
                            <TouchableOpacity
                              style={[styles.button, alignItemsCenter, borderRadius5, { marginTop: spacings.medium }]}
                              onPress={() => openReviewModal(item)}
                            >
                              <Text style={styles.buttonText}>Give a Review</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>)
                }}
              />
            </View> :
            <View style={[styles.centeredContainer, alignJustifyCenter]}>
              <Text style={{ color: colors.blackColor }}>No orders placed.</Text>
              <Text style={[textAlign, { color: colors.blackColor, margin: spacings.large }]}>Your all ordered will appear here. Currently its Empty</Text>
              <Pressable style={styles.button} onPress={() => onPressContinueShopping(ORDERS)}>
                <Text style={[styles.buttonText, textAlign]}>Continue Shopping</Text>
              </Pressable>
            </View>)
        }
        {
          route.params?.from === "Saved" &&
          (wishList && wishList.length > 0 ?
            <View style={[styles.detailsBox]}>
              <FlatList
                data={wishList}
                keyExtractor={(item) => item?.id?.toString()}
                numColumns={2}
                renderItem={({ item, index }) => {
                  // console.log(item)
                  // const imageUrl = item?.images?.edges?.[0]?.node?.url ?? item?.images?.nodes?.[0]?.url ?? item?.images?.[0]?.src;
                  const imageUrl = item?.images?.edges ? item?.images?.edges?.[0]?.node?.url : item?.images?.nodes ? item?.images?.nodes?.[0]?.url : item?.images?.[0]?.src ? item?.images?.[0]?.src : item.imageUrls[0]
                  const itemPrice = item?.variants?.edges?.[0]?.node?.price?.amount ?? item?.variants?.nodes?.[0]?.price ?? item?.variants?.[0]?.price;
                  const itemCurrencyCode = item?.variants?.edges?.[0]?.node?.price?.currencyCode ?? null;
                  const inventoryQuantity = item?.variants?.nodes ? item?.variants?.nodes[0]?.inventoryQuantity : (item?.variants?.[0]?.inventory_quantity ? item?.variants?.[0]?.inventory_quantity : (Array.isArray(item?.inventoryQuantity) ? item?.inventoryQuantity[0] : item?.inventoryQuantity));
                  const variantId = item?.variants?.edges ? item?.variants.edges[0]?.node.id : item?.variants?.nodes ? item?.variants?.nodes[0]?.id : item?.variants?.[0]?.admin_graphql_api_id ? item?.variants[0]?.admin_graphql_api_id : item.variantId[0];
                  return (
                    <View style={[styles.itemContainer, { backgroundColor: isDarkMode ? grayColor : whiteColor }]}>
                      <Pressable style={[positionAbsolute, alignJustifyCenter, styles.favButton]} onPress={() => handlePress(item)}>
                        <AntDesign
                          name={"heart"}
                          size={20}
                          color={colors.redColor}
                        />
                      </Pressable>
                      <Image
                        source={{ uri: imageUrl }}
                        style={[styles.productImage, resizeModeContain]}
                      />
                      <View style={{ width: "100%", height: hp(7), alignItems: "center", justifyContent: "center" }}>
                        <Text style={[styles.wishListItemName, textAlign, { color: colors.blackColor }]}>{item?.title}</Text>
                        <Text style={[styles.wishListItemPrice, textAlign, { color: colors.blackColor }]}>{item.price?.[0] ? item.price?.[0] : itemPrice} <Text style={[styles.wishListItemPrice]}>{itemCurrencyCode ? itemCurrencyCode : shopCurrency}</Text></Text>
                      </View>
                      <View style={[{ width: "100%", flexDirection: "row", paddingTop: spacings.large }, alignJustifyCenter]}>
                        {inventoryQuantity <= 0 ? <Pressable
                          style={[styles.addtocartButton, borderRadius10, alignJustifyCenter]}
                        >
                          <Text style={styles.addToCartButtonText}>Out of stock</Text>
                        </Pressable>
                          : <Pressable
                            style={[styles.addtocartButton, borderRadius10, alignJustifyCenter]}
                            onPress={() => addToCartProduct(item, 1)}
                          >
                            {loadingProductId === variantId ? <ActivityIndicator size="small" color={whiteColor} /> :
                              <Text style={styles.addToCartButtonText}>Add To Cart</Text>}
                          </Pressable>}
                      </View>
                    </View>
                  );
                }}
              />
            </View> :
            <View style={[styles.centeredContainer, alignJustifyCenter, { width: wp(80), alignSelf: "center" }]}>
              <View>
                <AntDesign
                  name={"hearto"}
                  size={50}
                  color={colors.mediumGray}
                />
              </View>
              <Text style={{ color: colors.blackColor, fontSize: style.fontSizeLarge.fontSize }}>No Saved found.</Text>
              <Text style={{ color: colors.mediumGray, textAlign: "center" }}>You don’t have any saved items. Go to home and add some.</Text>
            </View>)
        }
        {
          route.params?.from === SHIPPING_ADDRESS &&
          (customerAddresses && customerAddresses.length > 0 ? <View style={[styles.centeredContainer]}>
            <Text style={[styles.itemText, { marginVertical: spacings.normal, color: colors.blackColor }]}>Saved Address</Text>
            <FlatList
              data={customerAddresses}
              keyExtractor={(item) => item?.id.toString()}
              renderItem={({ item }) => {
                const isSelected = defaultAddressId === item?.id;
                return (
                  <Pressable style={[{ padding: spacings.large, borderWidth: 1, width: "100%", borderRadius: 10, marginVertical: 5, borderColor: colors.blackColor, backgroundColor: isDarkMode ? grayColor : "tranparent" }, flexDirectionRow]}
                    onPress={() => [setSelectedAddressId(item.id), setDefaultAddress(item?.id)]}>
                    <View style={[{ width: "15%" }, alignJustifyCenter]}>
                      <Ionicons
                        name={"location"}
                        size={30}
                        color={redColor}
                      />
                    </View>
                    <View style={{ width: "75%" }}>
                      {item.name && <View style={[flexDirectionRow]}>
                        <View style={{ width: "25%" }}>
                          <Text style={[styles.additemText, { color: colors.blackColor }]}>Name</Text>
                        </View>
                        <View style={{ width: "5%" }}>
                          <Text style={[styles.additemText, { color: colors.blackColor }]}>:</Text>
                        </View>
                        <View style={{ width: "50%" }}>
                          <Text style={[styles.additemText, { color: colors.blackColor }]}>{item.name}</Text>
                        </View>
                      </View>}
                      {item.phone && <View style={[flexDirectionRow]}>
                        <View style={{ width: "25%" }}>
                          <Text style={[styles.additemText, { color: colors.blackColor }]}>Phone</Text>
                        </View>
                        <View style={{ width: "5%" }}>
                          <Text style={[styles.additemText, { color: colors.blackColor }]}>:</Text>
                        </View>
                        <View style={{ width: "50%" }}>
                          <Text style={[styles.additemText, { color: colors.blackColor }]}>{item.phone}</Text>
                        </View>
                      </View>}
                      <View style={[flexDirectionRow]}>
                        <View style={{ width: "25%" }}>
                          <Text style={[styles.additemText, { color: colors.blackColor }]}>Address</Text>
                        </View>
                        <View style={{ width: "5%" }}>
                          <Text style={[styles.additemText, { color: colors.blackColor }]}>:</Text>
                        </View>
                        <View style={{ width: "70%" }}>
                          <Text style={[styles.additemText, { color: colors.blackColor }]}>{`${item.address1}, ${item.city}, ${item.province}, ${item.country}-${item.zip}`}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={[{ width: "10%" }, alignJustifyCenter]}>
                      <Fontisto
                        name={isSelected ? "radio-btn-active" : "radio-btn-passive"}
                        size={20}
                        color={redColor}
                      />
                    </View>
                  </Pressable>
                );
              }}
            />
            <Pressable style={[styles.addAddressButtonRounded, positionAbsolute, alignJustifyCenter]} onPress={onPressAddAddress}>
              <AntDesign name={"plus"} size={28} color={whiteColor} />
            </Pressable>
          </View> :
            <View style={[styles.centeredContainer, alignJustifyCenter]}>
              <Text style={{ color: colors.blackColor }}>No address found.</Text>
              <Pressable style={styles.button} onPress={() => onPressContinueShopping(SHIPPING_ADDRESS)}>
                <Text style={[styles.buttonText, textAlign]}>Continue Shopping</Text>
              </Pressable>
              <Pressable style={[styles.addAddressButtonRounded, positionAbsolute, alignJustifyCenter]} onPress={onPressAddAddress}>
                <AntDesign name={"plus"} size={28} color={whiteColor} />
              </Pressable>
            </View>)
        }
        {modalVisible && <AddAddressModal visible={modalVisible} onClose={() => setModalVisible(false)} />}
        {isModalVisible && <AddReviewModal visible={isModalVisible} onClose={() => setIsModalVisible(false)} productId={productId} customerName={customerName} />}
        <ChatButton onPress={handleChatButtonPress} />
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: whiteColor,
    width: wp(100),
    height: hp(100)
  },
  centeredContainer: {
    width: wp(100),
    height: hp(90),
    padding: spacings.large,
  },
  itemContainer: {
    padding: spacings.large,
    margin: spacings.large,
    width: wp(43),
    borderColor: 'transparent',
    backgroundColor: whiteColor,
    borderWidth: .1,
    borderRadius: 10,
    shadowColor: grayColor,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,

    elevation: 1.5,
  },
  itemText: {
    fontSize: style.fontSizeMedium.fontSize,
    color: blackColor,
    fontWeight: style.fontWeightThin1x.fontWeight,
  },
  wishListItemName: {
    color: blackColor,
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
  },
  wishListItemPrice: {
    fontSize: style.fontSizeSmall1x.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    // fontWeight: style.fontWeightMedium1x.fontWeight,
    color: blackColor,
    fontFamily: 'GeneralSans-Variable'
  },
  button: {
    marginTop: spacings.medium,
    padding: spacings.medium,
    backgroundColor: redColor,
    borderRadius: 5,
  },
  buttonText: {
    color: whiteColor,
  },
  addAddressButtonRounded: {
    bottom: 100,
    right: 20,
    width: wp(15),
    height: hp(7.5),
    backgroundColor: redColor,
    borderRadius: 50
  },
  addAddressButton: {
    bottom: 50,
    // right: 20,
    width: "100%",
    height: hp(6),
    // backgroundColor: redColor,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "center"
  },
  detailsBox: {
    width: wp(100),
    height: hp(87),
    padding: spacings.large
  },
  productImage: {
    width: "70%",
    height: hp(12),
    borderRadius: 10,
    alignSelf: "center",
    marginVertical: spacings.large
  },
  favButton: {
    width: wp(8),
    height: wp(8),
    right: 2,
    top: 2,
    zIndex: 10,
    // backgroundColor:whiteColor,
    borderRadius: 5
  },
  additemText: {
    fontSize: style.fontSizeNormal.fontSize,
    color: blackColor,
    // fontWeight: style.fontWeightThin1x.fontWeight,
  },
  addToCartButtonText: {
    fontSize: style.fontSizeNormal.fontSize,
    lineHeight: 20,
    color: whiteColor,
    fontWeight: style.fontWeightThin1x.fontWeight,
  },
  addtocartButton: {
    fontSize: style.fontSizeExtraExtraSmall.fontSize,
    // marginVertical: spacings.large,
    width: "68%",
    backgroundColor: redColor,
    padding: spacings.normal,
    // paddingHorizontal: spacings.large

  },
});

export default UserDashboardScreen;
