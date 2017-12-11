/**
 * Created by harry yang on 17/11/19.
 */

import React from 'react'
import {
  View,
  Text,
  RefreshControl,
  PanResponder,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  NetInfo,
  Alert,
  // ART,
  TouchableHighlight
} from 'react-native'
import SmartFlatList from './src/index'

// const { Surface, Shape, Path, LinearGradient } = ART;

// let AnimatedShape = Animated.createAnimatedComponent(Shape);
// let AnimatedSurface = Animated.createAnimatedComponent(Surface);
const { width, height } = Dimensions.get('window')
export default class RefreshAndLoadMorePage extends React.Component {


  constructor(props) {
    super(props);
    this.state = {}
  }

  async onFetch(page, pageSize, callback) {
    // do something for fetch data
    await this.fetch().then((response) => {
      !response ? callback('', '', true) : callback(response.hourly, response.sum)
    });
  }
  fetch() {
    var REQUEST_URL = 'https://weixin.jirengu.com/weather/future24h?cityid=WX4FBXXFKE4F';

    return fetch(REQUEST_URL).then((response) => response.json())
      .then((responseData) => {
        responseData.sum = responseData.hourly.length
        return responseData
      });
  }
  renderItem(data) {

    return (
      <View key={data.index} style={styles.container}>

        <View style={styles.views}>
          <View >
            <Text style={styles.title}>天气：{data.item.text}</Text>
          </View>
          <View >
            <Text style={styles.title}>气温：{data.item.temperature}</Text>
          </View>
        </View>
        <Text style={styles.title}>时间：{data.item.time}</Text>




      </View>
    );
  }
  footerView() {
    let footerLoading = () => (<View style={styles.footer}><ActivityIndicator animating={true} size="small" /><View style={{ marginLeft: 20 }}><Text style={{ textAlign: 'center' }}>正在加载中...</Text></View></View>);
    let loadingNoMore = () => <View style={styles.footer}><Text style={{ textAlign: 'center' }}>已经到底了</Text></View>
    let loadingMore = (_getMore) => <TouchableOpacity style={styles.footer} onPress={() => _getMore()} ><Text style={{ textAlign: 'center' }}>加载更多</Text></TouchableOpacity>
    let noDataView = (_rePostFetch) => <View>
      <Text style={{ textAlign: 'center' }}>没有数据</Text>
      <TouchableOpacity

        onPress={() => _rePostFetch()}
      >
        <Text style={{ color: '#333', textAlign: 'center' }}>点击立即刷新</Text>
      </TouchableOpacity>
    </View>
    let errorView = (_rePostFetch) => <View>
      <Text style={{ textAlign: 'center' }}>网络请求失败</Text>
      <TouchableOpacity

        onPress={() => _rePostFetch()}
      >
        <Text style={{ color: '#333', textAlign: 'center' }}>点击立即刷新</Text>
      </TouchableOpacity>
    </View>
    let loading = () => <Text style={{ textAlign: 'center' }}>正在加载中。。。</Text>
    return {
      footerLoading,
      loadingNoMore,
      loadingMore,
      noDataView,
      errorView,
      loading
    }
  }
  render() {

    return (
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: '#333', height: 100, width: Dimensions.get('window').width, justifyContent: 'center', alignItems: 'center' }}>
          <Text>其他内容区</Text>
        </View>
        <SmartFlatList
          topBackgroundColor={'#fccb57'}
          initialNumToRender={7}
          renderItem={(data) => this.renderItem(data)}
          initialPage={1}
          pageSize={10}
          onFetch={this.onFetch.bind(this)}
          {...this.footerView()}
        />
        <View style={{ backgroundColor: '#333', height: 100, width: Dimensions.get('window').width, justifyContent: 'center', alignItems: 'center' }}>
          <Text>其他内容区</Text>
        </View>
      </View>
    );
  }
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
    padding: 5,
    marginBottom: 10
  },
  rightContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  year: {
    textAlign: 'center',
  },
  thumbnail: {
    width: 53,
    height: 81,
  },
  list: {
    paddingTop: 20,
    backgroundColor: '#F5FCFF',
  },
  wrap: {
    flex: 1,
    position: 'relative',
    zIndex: -1
  },
  headWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eea0a1'
  },
  hide: {
    position: 'absolute',
    left: 10000
  },
  show: {
    position: 'relative',
    left: 0,
    flexDirection: 'row',
    width: Dimensions.get('window').width,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999
  },
  arrow: {
    height: 30,
    width: 30,
    marginRight: 20,
  },
  arrowText: {
    marginLeft: 20,
  },
  views: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexDirection: 'row'
  },
  footer: {
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    height: 60
  }
});