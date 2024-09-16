import React, { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import { blackColor, grayColor, redColor, whiteColor, lightGreenColor, lightGrayColor, lightGrayOpacityColor } from '../constants/Color'
import { widthPercentageToDP as wp, heightPercentageToDP as hp, } from '../utils';
import { spacings, style } from '../constants/Fonts';
import { BaseStyle } from '../constants/Style';
import { ADD_TO_CART, INSTOCK, OUT_OF_STOCK } from '../constants/Constants';
import Ionicons from 'react-native-vector-icons/dist/Ionicons';
import AntDesign from 'react-native-vector-icons/dist/AntDesign';
import QuickViewModal from './Modal/QuickViewModal'
import { useDispatch, useSelector } from 'react-redux';
import { addToWishlist, removeFromWishlist } from '../redux/actions/wishListActions';
import { logEvent } from '@amplitude/analytics-react-native';
import { addProductToCart, removeProductFromCart } from '../redux/actions/cartActions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemes } from '../context/ThemeContext';
import { lightColors, darkColors } from '../constants/Color';
const { alignItemsCenter, resizeModeCover, flexDirectionRow, alignJustifyCenter, borderWidth1, textAlign, resizeModeContain, positionAbsolute } = BaseStyle;

const ProductVertical = ({ product, onAddToCart, inventoryQuantity, loading, onPress, option, ids, width }) => {
  const { isDarkMode } = useThemes();
  const colors = isDarkMode ? darkColors : lightColors;
  const imageSource = product?.images?.edges ? product?.images?.edges[0]?.node?.url : product?.images?.nodes[0]?.url;
  const price = product?.variants?.edges ? product?.variants?.edges[0]?.node?.price : product?.variants?.nodes[0];
  const priceAmount = price?.price ? price?.price : price?.amount;
  const currencyCode = price ? price?.currencyCode : null;
  const [quantity, setQuantity] = useState(1);
  const outOfStock = inventoryQuantity && inventoryQuantity[0] === 0;
  const [modalVisible, setModalVisible] = useState(false);
  const dispatch = useDispatch();
  const wishList = useSelector(state => state.wishlist.wishlist);
  const isSelected = wishList.some(item => item.id === product.id);
  const cart = useSelector(state => state.cart.cartItems);
  const isInCart = cart.some(item => item.id === product.id);
  const [showQuantity, setShowQuantity] = useState(false);
  const [shopCurrency, setShopCurrency] = useState('');
  useEffect(() => {
    if (!isInCart) {
      setShowQuantity(false);
    }
  }, [cart, isInCart]);

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

  const handlePress = () => {
    const productWithInventory = {
      ...product,
      inventoryQuantity: inventoryQuantity
    };
    if (!isSelected) {
      dispatch(addToWishlist(product));
      logEvent(`Product Add to wishlish ProductId: ${product.id}`);
    } else {
      dispatch(removeFromWishlist(product));
      logEvent(`Product remove from wishlist ProductId: ${product.id}`);
    }
  };

  const incrementQuantity = () => {
    logEvent('Increase Product Quantity');
    setQuantity(quantity + 1);
    onAddToCart(product?.variants?.edges ? product?.variants?.edges[0]?.node?.id : product?.variants?.nodes[0]?.id, 1);
  };

  const decrementQuantity = () => {
    logEvent('Decrease Product Quantity');
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const showQuickViewModal = () => {
    setModalVisible(true)
    logEvent(`Quick view modal open for  ${product.id}`)
  }
  const handleAddToCart = () => {
    logEvent('Add to Cart');
    onAddToCart(product?.variants?.edges ? product?.variants?.edges[0]?.node?.id : product?.variants?.nodes[0]?.id, quantity);
    setShowQuantity(true);
  };

  const trimcateText = (text) => {
    const words = text.split(' ');
    if (words.length > 3) {
      return words.slice(0, 3).join(' ') + '...';
    }
    return text;
  };

  return (
    <Pressable style={[styles.productContainer, alignJustifyCenter, {
      width: width ? width : wp(41), backgroundColor: isDarkMode ? grayColor : whiteColor,
      margin: isDarkMode ? spacings.xxsmall : 0, borderRadius: 5
    }]} onPress={onPress}>
      <View style={{ width: "80%", marginBottom: spacings.small, borderRadius: 10 }}>
        <TouchableOpacity style={[positionAbsolute, alignJustifyCenter, styles.eyeButton]} onPress={showQuickViewModal}>
          <Ionicons
            name="eye-outline"
            size={18}
            color={blackColor}
          />
        </TouchableOpacity>
        <Image
          source={{ uri: imageSource }}
          style={[styles.productImage, resizeModeCover]}
        />
      </View>
      <View style={[styles.contentBox]}>
        <View style={[{ width: "90%", height: hp(8),alignSelf:"center" }]}>
          <Text style={[styles.productName, { paddingRight: spacings.small, color: colors.blackColor }]}>{trimcateText(product?.title)}</Text>
          {priceAmount && (
            <Text style={[styles.productPrice, { color: colors.blackColor }]}>
              {priceAmount} {currencyCode ? currencyCode : shopCurrency}
            </Text>)}
        </View>
        <View style={[{ width: "99.5%", paddingVertical: spacings.small, justifyContent: "space-between" }, flexDirectionRow, alignItemsCenter]}>
          {loading ? (
            <View style={styles.addToCartButton}>
              <ActivityIndicator size="small" color={redColor} />
            </View>
          ) : (showQuantity && !outOfStock ? (
            <View style={[styles.quantityContainer, borderWidth1]}>
              <TouchableOpacity onPress={decrementQuantity}>
                <Text style={styles.quantityButton}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantity}>{quantity}</Text>
              <TouchableOpacity onPress={incrementQuantity}>
                <Text style={styles.quantityButton}>+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            !outOfStock && (
              <Pressable
                style={styles.addToCartButton}
                onPress={handleAddToCart}>
                <Text style={styles.addToCartButtonText}>{ADD_TO_CART}</Text>
              </Pressable>
            )
          ))}
          {outOfStock && (
            <View style={[styles.addToCartButton, { width: isDarkMode ? wp(21) : wp(22) }]}>
              <Text style={styles.addToCartButtonText}>{OUT_OF_STOCK}</Text>
            </View>
          )}
          <TouchableOpacity style={[positionAbsolute, alignJustifyCenter, styles.favButton]} onPress={handlePress}>
            <AntDesign
              name={isSelected ? "heart" : "hearto"}
              size={18}
              color={redColor}
            />
          </TouchableOpacity>
        </View>
        <QuickViewModal
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
          product={product}
          options={option}
          ids={ids}
          shopCurrency={shopCurrency}
        />
      </View>

    </Pressable>
  );
};

const styles = StyleSheet.create({
  productContainer: {
    paddingVertical: spacings.large,
  },
  productImage: {
    width: "100%",
    height: hp(13.5),
    borderRadius: 10,
    alignSelf: "center",
    marginVertical: spacings.large
  },
  productName: {

    fontSize: style.fontSizeSmall1x.fontSize, fontWeight: style.fontWeightThin1x.fontWeight,
  },
  text: {
    color: "#006400",
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightThin.fontWeight,
  },
  productPrice: {
    fontSize: style.fontSizeSmall1x.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,

    fontFamily: 'GeneralSans-Variable'
  },
  contentBox: {
    width: "100%",
    paddingHorizontal: spacings.small,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: wp(20),
    backgroundColor: whiteColor,
    paddingHorizontal: 9,
    paddingVertical: 2,
    justifyContent: "center",
    borderRadius: 10,
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
  addToCartButton: {
    width: wp(20),
    borderRadius: 10,
    fontSize: 8,
    borderWidth: 1,
    borderColor: redColor,
    backgroundColor: whiteColor,
    paddingVertical: 5,
  },
  addToCartButtonText: {
    fontSize: 11,
    lineHeight: 18,
    color: redColor,
    fontWeight: '700',
    textAlign: 'center',
  },
  favButton: {
    width: wp(10),
    paddingVertical: 4,
    right: 0,
    bottom: 4,
    zIndex: 10,
    borderWidth: 1,
    borderColor: redColor,
    backgroundColor: whiteColor,
    borderRadius: 10,
  },
  eyeButton: {
    width: wp(8),
    height: wp(8),
    right: 3,
    top: 6,
    zIndex: 10,
    borderRadius: 10,
  },
});

export default ProductVertical;
