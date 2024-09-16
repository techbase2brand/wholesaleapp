import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image,  } from 'react-native';
import { redColor, blackColor, grayColor, whiteColor } from '../constants/Color'
import Ionicons from 'react-native-vector-icons/dist/Ionicons';
import { spacings, style } from '../constants/Fonts';
import { BaseStyle } from '../constants/Style';
import { MENU_ICON, SHOPPINGBUCKET_ICON, SEARCH_ICON, DARK_MODE_APP_CARTIFY_HEADER_LOGO_NEW, WHITE_MENU_ICON, WHITE_SHOPPINGBUCKET_ICON, WHITE_SEARCH_ICON, APP_CARTIFY_HEADER_LOGO_NEW } from '../assests/images'
import { widthPercentageToDP as wp, heightPercentageToDP as hp, } from '../utils';
import { logEvent } from '@amplitude/analytics-react-native';
import MenuModal from '../components/Modal/MenuModal';
import { useCart } from '../context/Cart';
import { useThemes } from '../context/ThemeContext';
import { lightColors, darkColors } from '../constants/Color';
const { alignItemsCenter, alignJustifyCenter, flexDirectionRow, justifyContentSpaceBetween } = BaseStyle;
const Header = ({ navigation, backIcon, text, onPress, textinput, notification, image, closeIcon, menuImage, onClosePress, shoppingCart, onPressShopByCatagory }: { navigation: any, backIcon?: boolean, text?: string, textinput?: boolean, notification?: boolean }) => {
  const { totalQuantity } = useCart();
  const [modalVisible, setModalVisible] = useState(false)
  const { isDarkMode } = useThemes();
  const colors = isDarkMode ? darkColors : lightColors;
  const OnClickBackIcon = () => {
    logEvent('Back Button Clicked');
    navigation.goBack()
  }
  const OnClickCartIcon = () => {
    logEvent('CartIcon Clicked');
    navigation.navigate("CartModal")
  }
  const OnClickSearchBar = () => {
    logEvent('SearchBar Clicked');
    navigation.navigate('Search', { navigation: navigation })
  }
  const OnClickClose = () => {
    onClosePress()
  }
  const trimcateText = (text) => {
    const words = text.split(' ');
    if (words.length > 3) {
      return words.slice(0, 3).join(' ') + '...';
    }
    return text;
  };
  return (
    <View >
      <View style={[flexDirectionRow, alignJustifyCenter, justifyContentSpaceBetween, { height: hp(6), width: "99%" }]}>
        <View style={[flexDirectionRow, alignItemsCenter]}>
          {backIcon && <TouchableOpacity style={[alignJustifyCenter, { width: wp(10) }]} onPress={OnClickBackIcon}>
            <Ionicons name={"arrow-back"} size={30} color={colors.blackColor} />
          </TouchableOpacity>}
          {closeIcon && <TouchableOpacity style={[alignJustifyCenter, { width: wp(10) }]} onPress={OnClickClose}>
            <Ionicons name={"close"} size={35} color={colors.blackColor} />
          </TouchableOpacity>}
          {menuImage && <TouchableOpacity style={[alignJustifyCenter, { width: wp(10) }]} onPress={() => {setModalVisible(true), logEvent('Menu Button Clicked')}}>
            <Image source={isDarkMode ? WHITE_MENU_ICON : MENU_ICON} style={{ width: wp(6), height: hp(4), resizeMode: "contain", marginLeft: spacings.large }} />
          </TouchableOpacity>}
          {text && <Text style={[styles.text, { color: colors.blackColor }]}>{trimcateText(text)}</Text>}
        </View>
        {image && <Image source={isDarkMode ? DARK_MODE_APP_CARTIFY_HEADER_LOGO_NEW : APP_CARTIFY_HEADER_LOGO_NEW} style={{ width: wp(34), height: hp(4.5), resizeMode: "contain", marginLeft: spacings.Large1x }} />}
        <View style={[flexDirectionRow, { width: "auto",marginRight:spacings.large }, justifyContentSpaceBetween, alignItemsCenter]}>
          {textinput && <TouchableOpacity style={[alignJustifyCenter, { width: wp(10) }]} onPress={OnClickSearchBar}>
            <Image source={isDarkMode ? WHITE_SEARCH_ICON : SEARCH_ICON} style={{ width: wp(6), height: hp(3.5), resizeMode: "contain", marginLeft: spacings.large }} />
          </TouchableOpacity>}
          {shoppingCart && <TouchableOpacity style={[alignJustifyCenter, { width: wp(10) }]} onPress={OnClickCartIcon}>
            <Image source={isDarkMode ? WHITE_SHOPPINGBUCKET_ICON : SHOPPINGBUCKET_ICON} style={{ width: wp(6), height: hp(3.3), resizeMode: "contain", marginLeft: spacings.large }} />
            {totalQuantity > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{totalQuantity}</Text>
              </View>
            )}
          </TouchableOpacity>}
        </View>
      </View>
      {modalVisible && <MenuModal
        modalVisible={modalVisible} setModalVisible={setModalVisible} onPressCart={OnClickCartIcon} onPressSearch={OnClickSearchBar} navigation={navigation} onPressShopByCatagory={onPressShopByCatagory} />}
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: style.fontSizeMedium1x.fontSize,
    fontWeight: style.fontWeightMedium1x.fontWeight,
    color: blackColor,
    marginLeft: spacings.normalx
  },
  input: {
    width: "100%",
    height: hp(6),
    borderColor: 'transparent',
    borderWidth: .1,
    borderRadius: 10,
    paddingHorizontal: spacings.large,
    marginTop: spacings.large,
    shadowColor: grayColor,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 1.5,
  },
  suggestionBox: {
    top: hp(7.1),
    left: 0,
    right: 0,
    backgroundColor: whiteColor,
    zIndex: 1,
    width: wp(95),
    height: "auto"
  },
  itembox: {
    width: wp(100),
    height: hp(14),
    top: hp(8),
    left: 0,
    right: 0,
    backgroundColor: whiteColor,
    zIndex: 1,
    padding: spacings.large,
  },
  suggestionItem: {
    padding: spacings.large,
    width: wp(100),
    height: hp(5),
    zIndex: 1,
  },
  textinputBox: {
    width: "93%",
    height: hp(6),
    borderColor: 'transparent',
    borderWidth: .1,
    borderRadius: 10,
    paddingHorizontal: spacings.large,
    marginTop: spacings.small,
    shadowColor: grayColor,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 1.5,
    alignSelf: 'center'
  },
  badgeContainer: {
    position: 'absolute',
    top: 0,
    right: 4,
    backgroundColor: redColor,
    borderRadius: wp(2),
    width: wp(4),
    height: wp(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: whiteColor,
    fontSize: wp(2.5),
    fontWeight: 'bold',
  },

});

export default Header;
